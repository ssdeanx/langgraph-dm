import mermaid from 'mermaid';
import { StateGraph, CompiledStateGraph } from '@langchain/langgraph';
import { promises as fs } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { AgentAnnotation } from '../agent/state.js'; // Correctly import the annotation

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
