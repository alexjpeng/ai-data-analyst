import { Sandbox } from '@e2b/code-interpreter';
import { Groq } from 'groq-sdk';
import { CompletionCreateParams } from 'groq-sdk/src/resources/chat/completions';
import { StreamingTextResponse, Message } from 'ai';

const MODEL_NAME = 'llama3-70b-8192';

function getSystemPrompt(datasetPath: string) {
  return `You are a data analyst assistant. You help users analyze their CSV data and create visualizations. When working with data:
- Use pandas for data manipulation and analysis
- Use matplotlib or seaborn for visualizations
- Always create new figures with plt.figure() before plotting
- Save plots to display them: plt.savefig('temp.png'); with plt.close() after
- Install required packages using pip if needed
- The CSV file is located at: ${datasetPath}
- Always explain your analysis in simple terms
- When creating charts, use clear titles, labels, and legends

Example of reading the CSV:
import pandas as pd
df = pd.read_csv('${datasetPath}')`;
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
                  const execution = await sandbox.runCode(code);
                  
                  if (execution.error) {
                    controller.enqueue(`Error: ${execution.error.value}\n${execution.error.traceback}\n`);
                    continue;
                  }

                  // Handle stdout logs
                  if (execution.logs.stdout.length > 0) {
                    controller.enqueue(execution.logs.stdout.join('\n') + '\n');
                  }

                  // Handle stderr logs
                  if (execution.logs.stderr.length > 0) {
                    controller.enqueue(`Error output:\n${execution.logs.stderr.join('\n')}\n`);
                  }

                  // Process results
                  for (const result of execution.results) {
                    // Handle different result types
                    if (result.png) {
                      controller.enqueue(`![Chart](data:image/png;base64,${result.png})\n`);
                    } else if (result.text) {
                      controller.enqueue(result.text + '\n');
                    } else if (result.html) {
                      controller.enqueue(result.html + '\n');
                    } else if (result.markdown) {
                      controller.enqueue(result.markdown + '\n');
                    }

                    // Handle DataFrame or other data structures
                    if (result.data) {
                      controller.enqueue(`\`\`\`
${JSON.stringify(result.data, null, 2)}
\`\`\`\n`);
                    }
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
        // } finally {
        //   controller.close();
        //   // Clean up sandbox in the finally block
        //   if (sandbox) {
        //     try {
        //       await sandbox.kill();
        //     } catch (error) {
        //       console.error('Error closing sandbox:', error);
        //     }
        //   }
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error:', error);
    // Clean up sandbox in case of error
    // if (sandbox) {
    //   try {
    //     await sandbox.kill();
    //   } catch (closeError) {
    //     console.error('Error closing sandbox:', closeError);
    //   }
    // }
    return new Response(JSON.stringify({ error: 'Error processing chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 