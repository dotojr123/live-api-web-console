/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from "@google/genai";

const altairDeclaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

const chromeDevToolsDeclaration: FunctionDeclaration = {
  name: "chrome-devtools",
  description:
    "Interacts with a web browser to perform tasks like searching, browsing, and extracting information from web pages. Use this tool for any requests that require accessing a website.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      instructions: {
        type: Type.STRING,
        description:
          "A clear and concise instruction for the browser to execute. For example: 'Go to example.com and find the contact email.'",
      },
    },
    required: ["instructions"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful assistant. You have two tools at your disposal: "render_altair" for creating graphs, and "chrome-devtools" for interacting with websites. Use "chrome-devtools" for any tasks involving web browsing or information retrieval from the internet. Use "render_altair" when asked to create a graph.',
          },
        ],
      },
      tools: [
        { googleSearch: {} },
        {
          functionDeclarations: [altairDeclaration, chromeDevToolsDeclaration],
        },
      ],
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls || toolCall.functionCalls.length === 0) {
        return;
      }

      console.log("Received tool calls:", toolCall.functionCalls);

      const responses = await Promise.all(
        toolCall.functionCalls.map(async (fc) => {
          let response: any;
          try {
            // Handle Altair graph rendering
            if (fc.name === altairDeclaration.name) {
              const str = (fc.args as any).json_graph;
              setJSONString(str); // Update state for local rendering
              response = { output: { success: true } }; // Simple success response
            }
            // Handle Chrome DevTools delegation
            else if (fc.name === chromeDevToolsDeclaration.name) {
              console.log(
                `Delegating task to chrome-devtools:`,
                fc.args
              );
              const apiResponse = await fetch(
                "http://localhost:3001/execute-task",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    toolName: "chrome-devtools",
                    params: fc.args,
                  }),
                }
              );

              if (!apiResponse.ok) {
                const errorResult = await apiResponse.json();
                throw new Error(
                  `Task agent failed: ${errorResult.error || apiResponse.statusText}`
                );
              }

              const result = await apiResponse.json();
              response = { output: result }; // The result from the backend
            }
            // Handle unknown tools
            else {
              throw new Error(`Unknown tool call: ${fc.name}`);
            }
          } catch (e) {
            const errorMessage =
              e instanceof Error ? e.message : "An unknown error occurred";
            console.error(
              `Error processing tool call ${fc.name} (${fc.id}):`,
              errorMessage
            );
            response = {
              error: {
                code: -1,
                message: errorMessage,
              },
            };
          }

          return {
            response,
            id: fc.id,
            name: fc.name,
          };
        })
      );

      console.log("Sending tool responses:", responses);
      client.sendToolResponse({ functionResponses: responses });
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log("jsonString", jsonString);
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
