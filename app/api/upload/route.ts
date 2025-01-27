import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

export async function POST(req: NextRequest) {
  let sandbox: Sandbox | undefined;
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create sandbox instance
    sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 300_000
    });

    // Convert file to buffer and write to sandbox
    const arrayBuffer = await file.arrayBuffer();
    const dataSetPath = await sandbox.files.write('/home/user/dataset.csv', arrayBuffer);

    // Install required Python packages
    await sandbox.runCode(`
      !pip install pandas numpy matplotlib seaborn
    `);

    return NextResponse.json({
      message: 'File uploaded successfully',
      filename: file.name,
      datasetPath: dataSetPath.path,
      sandboxId: sandbox.sandboxId
    });
  } catch (error) {
    console.error('Upload error:', error);
    // if (sandbox) {
    //   try {
    //     await sandbox.kill();
    //   } catch (closeError) {
    //     console.error('Error closing sandbox:', closeError);
    //   }
    // }
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
} 