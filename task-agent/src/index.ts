import express, { Request, Response } from 'express';
import cors from 'cors';
import { runChromeDevTools } from './tools/chrome-devtools';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// A simple tool registry to map tool names to their functions
const toolRegistry: { [key: string]: (params: any) => Promise<any> } = {
  'chrome-devtools': runChromeDevTools,
  // Future tools can be added here
};

app.get('/', (req: Request, res: Response) => {
  res.send('Task Agent is running!');
});

interface ExecuteTaskRequest {
  toolName: string;
  params: { [key: string]: any };
}

app.post('/execute-task', async (req: Request, res: Response) => {
  const { toolName, params } = req.body as ExecuteTaskRequest;

  if (!toolName || !params) {
    return res.status(400).json({ error: 'Missing toolName or params in the request body.' });
  }

  const toolFunction = toolRegistry[toolName];
  if (!toolFunction) {
    return res.status(404).json({ error: `Tool "${toolName}" not found.` });
  }

  console.log(`Executing tool "${toolName}" with params:`, params);

  try {
    const result = await toolFunction(params);
    res.json({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Task Agent listening at http://localhost:${port}`);
});