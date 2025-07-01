import mermaid from 'mermaid';
import { StateGraph, CompiledStateGraph } from '@langchain/langgraph';
import { promises as fs } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { AgentAnnotation } from '../agent/state.js'; // Correctly import the annotation

/**
 * The `generateMermaidPng` function generates a PNG image from a StateGraph or CompiledStateGraph
 * object by creating a visual representation of the graph using Mermaid syntax and saving it to a
 * specified output path.
 * @param {StateGraph<any> | CompiledStateGraph<any, any>} graph - The `graph` parameter in the
 * `generateMermaidPng` function is expected to be either a `StateGraph` or `CompiledStateGraph`
 * object. These objects represent a graph structure containing nodes and edges that define states and
 * transitions in a system.
 * @param {string} outputPath - The `outputPath` parameter in the `generateMermaidPng` function is a
 * string that represents the file path where the generated PNG image will be saved. You need to
 * provide the full path including the file name and extension where you want the PNG image to be saved
 * on your filesystem. For
 */

export async function generateMermaidPng(
  graph: StateGraph<any> | CompiledStateGraph<any, any>,
  outputPath: string,
): Promise<void> {
  const compiledGraph = 'compile' in graph ? graph.compile() : graph;
  const graphData = await compiledGraph.getGraphAsync();
  const nodes = Object.keys(graphData.nodes);
  const edges = graphData.edges.map(
    (edge: { source: string; target: string; data?: string | null }) => ({
      source: edge.source,
      target: edge.target,
      data: edge.data,
    }),
  );

  /* The code snippet you provided is using the imported `AgentAnnotation` to generate a state schema
  legend. Here's a breakdown of what it does: */
  // Use the imported AgentAnnotation to generate a state schema legend
  const stateKeys = Object.keys(AgentAnnotation.spec);
  const stateSchemaDefinition = `
    subgraph State Schema
      direction LR
      ${stateKeys.map((key) => `state_${key}[${key}]`).join('\n      ')}
    end
  `;

  const mermaidGraph = `graph TD
    ${stateSchemaDefinition}

    ${nodes.map((node: string) => `  ${node}[${node}]`).join('\n')}
    ${edges
      .map((edge: { source: string; target: string; data?: string | null }) => {
        const edgeLabel = edge.data ? `|${edge.data}|` : '';
        return `  ${edge.source} -->${edgeLabel} ${edge.target}`;
      })
      .join('\n')}
  `;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
  });

  const { svg } = await mermaid.render('graphDiv', mermaidGraph);

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
  ctx.drawImage(img, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

/**
 * The function generates a PNG image from a Mermaid graph defined by nodes and edges and saves it to a
 * specified output path.
 * @param {string[]} nodes - The `nodes` parameter is an array of strings representing the nodes in the
 * graph. Each string corresponds to a node in the graph.
 * @param edges - The `edges` parameter in the `generateMermaidPngFromDefinition` function is an array
 * of objects representing the connections between nodes in a graph. Each object in the array has two
 * properties: `source` and `target`, which specify the nodes that are connected by an edge.
 * @param {string} outputPath - The `outputPath` parameter in the `generateMermaidPngFromDefinition`
 * function is a string that represents the file path where the generated PNG image will be saved. It
 * should include the file name and extension (e.g., 'output.png') along with the directory path where
 * you want to
 */
// Alternative approach: Accept node and edge information explicitly
export async function generateMermaidPngFromDefinition(
  nodes: string[],
  edges: Array<{ source: string; target: string }>,
  outputPath: string
): Promise<void> {
  const mermaidGraph = `graph TD
${nodes.map(node => `  ${node}[${node}]`).join('\n')}
${edges.map(edge => `  ${edge.source} --> ${edge.target}`).join('\n')}`;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
  });

  const { svg } = await mermaid.render('graphDiv', mermaidGraph);

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  ctx.drawImage(img, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}
