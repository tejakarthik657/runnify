const mongoose = require('mongoose');

class GraphNode {
  constructor(id, lat, lng, h3Index) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.h3Index = h3Index;
    this.edges = [];
  }
}

class GraphEdge {
  constructor(targetNodeId, distanceKm, h3Index) {
    this.targetNodeId = targetNodeId;
    this.distanceKm = distanceKm;
    this.h3Index = h3Index;
  }
}

class RoadGraph {
  constructor() {
    this.nodes = new Map();
    this.adjacency = new Map();
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(sourceId, targetId, distanceKm, h3Index) {
    const edge = new GraphEdge(targetId, distanceKm, h3Index);
    this.adjacency.get(sourceId)?.push(edge);
  }

  getNeighbors(nodeId) {
    return this.adjacency.get(nodeId) || [];
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }
}

function buildGraphFromGeoJSON(geojson) {
  const graph = new RoadGraph();
  const features = geojson.features || [];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates || [];
    if (coords.length < 2) continue;

    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const sourceId = `${lat1.toFixed(5)},${lng1.toFixed(5)}`;
      const targetId = `${lat2.toFixed(5)},${lng2.toFixed(5)}`;
      const h3Index = feature.properties?.h3_index || null;
      const distanceKm = haversineKm(lat1, lng1, lat2, lng2);

      if (!graph.nodes.has(sourceId)) {
        graph.addNode(new GraphNode(sourceId, lat1, lng1, h3Index));
      }
      if (!graph.nodes.has(targetId)) {
        graph.addNode(new GraphNode(targetId, lat2, lng2, h3Index));
      }

      graph.addEdge(sourceId, targetId, distanceKm, h3Index);
      graph.addEdge(targetId, sourceId, distanceKm, h3Index);
    }
  }

  return graph;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  RoadGraph,
  GraphNode,
  GraphEdge,
  buildGraphFromGeoJSON,
  haversineKm,
};
