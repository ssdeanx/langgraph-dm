

import mermaid from 'mermaid';
import { StateGraph } from '@langchain/langgraph';
import { promises as fs } from 'fs';
import { createCanvas, loadImage } from 'canvas';

export async function generateMermaidPng(graph: StateGraph, outputPath: string) {
  const graphDefinition = graph.getGraph();
  const mermaidGraph = `graph TD\n${graphDefinition.nodes.map(node => `  ${node.id}[${node.id}]`).join('\n')}\n${graphDefinition.edges.map(edge => `  ${edge.source} --> ${edge.target}`).join('\n')}`;

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
