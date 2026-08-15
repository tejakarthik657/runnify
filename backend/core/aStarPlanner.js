const { RoadGraph, haversineKm } = require('./osm.service');

const CLAIM_WEIGHT = 0.5;

function getHexValue(h3Index, userFaction, territoryMap) {
  if (!h3Index || !territoryMap) return 0;
  const territory = territoryMap.get(h3Index);
  if (!territory) return CLAIM_WEIGHT;
  if (territory.faction && territory.faction !== userFaction) return CLAIM_WEIGHT * 1.5;
  return 0;
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  let node = current;
  while (cameFrom.has(node)) {
    node = cameFrom.get(node);
    path.unshift(node);
  }
  return path;
}

function planOptimalRoute(startNodeId, targetDistance, userFaction, graph, territoryMap = new Map()) {
  const openSet = new PriorityQueue();
  openSet.enqueue(startNodeId, 0);

  const cameFrom = new Map();
  const gScore = new Map();
  gScore.set(startNodeId, 0);

  const startNode = graph.getNode(startNodeId);
  if (!startNode) return null;

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    const currentG = gScore.get(current) || 0;

    if (currentG >= targetDistance * 0.8) {
      const distToStart = haversineKm(
        graph.getNode(current)?.lat || startNode.lat,
        graph.getNode(current)?.lng || startNode.lng,
        startNode.lat,
        startNode.lng
      );
      if (distToStart <= targetDistance * 0.25) {
        return reconstructPath(cameFrom, current);
      }
    }

    const neighbors = graph.getNeighbors(current);
    for (const edge of neighbors) {
      const tentativeG = currentG + edge.distanceKm;
      const bestG = gScore.get(edge.targetNodeId);

      if (bestG === undefined || tentativeG < bestG) {
        cameFrom.set(edge.targetNodeId, current);
        gScore.set(edge.targetNodeId, tentativeG);

        const edgeNode = graph.getNode(edge.targetNodeId);
        const claimVal = getHexValue(edge.h3Index, userFaction, territoryMap);
        const distToStart = edgeNode
          ? haversineKm(edgeNode.lat, edgeNode.lng, startNode.lat, startNode.lng)
          : 0;
        const f = tentativeG + distToStart - claimVal;

        openSet.enqueue(edge.targetNodeId, f);
      }
    }
  }

  return null;
}

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  enqueue(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0].item;
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority < this.heap[parent].priority) {
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

module.exports = {
  planOptimalRoute,
  PriorityQueue,
  getHexValue,
  reconstructPath,
};
