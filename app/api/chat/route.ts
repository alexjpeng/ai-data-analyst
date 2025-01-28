import { Sandbox } from '@e2b/code-interpreter';
import { Groq } from 'groq-sdk';
import { CompletionCreateParams } from 'groq-sdk/resources/chat/completions';
import { StreamingTextResponse, Message } from 'ai';

const MODEL_NAME = 'llama-3.3-70b-versatile';

function getSystemPrompt(datasetPath: string) {
  return `You are a data analyst assistant. You help users analyze their CSV data and create visualizations. When working with data:
- Use pandas for data manipulation and analysis
- Use matplotlib or seaborn for visualizations
- Always create new figures with plt.figure() before plotting
- Always use plt.show() to display plots
- Make sure to close figures with plt.close() after showing them
- Install required packages using pip if needed
- The CSV file is located at: ${datasetPath}
- Always explain your analysis in simple terms
- When creating charts, use clear titles, labels, and legends

Example of reading the CSV and creating a plot:
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('${datasetPath}')
plt.figure(figsize=(10, 6))
# Create your plot here
plt.show()
plt.close()`;
}

const tools: Array<CompletionCreateParams.Tool> = [
  {
    type: 'function',
    function: {
      name: 'execute_python',
      description: 'Execute python code in the sandbox environment and return results.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The python code to execute.',
          },
        },
        required: ['code'],
      },
    },
  },
];

export async function POST(req: Request) {
  let sandbox: Sandbox | undefined;

  try {
    const { messages, data } = await req.json();
    const { sandboxId, datasetPath } = data;
    
    if (!sandboxId || !datasetPath) {
      throw new Error('Missing sandboxId or datasetPath');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Connect to existing sandbox
    sandbox = await Sandbox.connect(sandboxId);

    const response = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: getSystemPrompt(datasetPath) },
        ...messages,
      ],
      tools,
      max_tokens: 4096,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const toolCalls = chunk.choices[0]?.delta?.tool_calls;
            
            if (toolCalls) {
              const toolCall = toolCalls[0];
              if (toolCall?.function?.name === 'execute_python') {
                try {
                  const code = JSON.parse(toolCall.function.arguments).code;
                  controller.enqueue(`\n\`\`\`python\n${code}\n\`\`\`\n\n`);
                  const execution = await sandbox.runCode(code, { 
                    onResult: result => {
                      console.log('result:', result);
                      // Handle results immediately as they arrive
                        
                      if(result.png) {
                        controller.enqueue(`\n![Generated Chart](${result.png})\n\n`);
                      }

                      if(result.chart) {
                        controller.enqueue(`\n![Generated Chart](${result.chart})\n\n`);
                      }
                    },
                    onStdout: data => {
                      controller.enqueue(data.line);
                    },
                    onStderr: data => {
                      controller.enqueue(`Error: ${data.line}`);
                    },
                    onError: error => {
                      controller.enqueue(`Execution error: ${error.value}\n${error.traceback}\n`);
                    }
                  });
                  
                  if (execution.error) {
                    controller.enqueue(`Error: ${execution.error.value}\n${execution.error.traceback}\n`);
                    continue;
                  }
                } catch (error) {
                  controller.enqueue(`Error executing code: ${error.message}\n`);
                }
              }
            } else if (chunk.choices[0]?.delta?.content) {
              controller.enqueue(chunk.choices[0].delta.content);
            }
          }
        } catch (error) {
          controller.enqueue(`Stream error: ${error.message}\n`);
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Error processing chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 