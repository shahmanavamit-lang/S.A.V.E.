#include <iostream>
using namespace std;

#define V 15
#define INF 99999

struct AmbulanceQueue {
  int items[3];
  int front = 0, rear = 0;
  void push(int id) {
    if (rear < 3)
      items[rear++] = id;
  }
  int pop() { return front < rear ? items[front++] : -1; }
  bool isEmpty() { return front == rear; }
};

struct Emergency {
  int dest;
  int priority;
};
struct PriorityQueue {
  Emergency items[3];
  int size = 0;

  void push(int dest, int priority) {
    if (size >= 3)
      return;
    items[size++] = {dest, priority};

    for (int i = size - 1; i > 0; i--) {
      if (items[i].priority < items[i - 1].priority) {
        Emergency temp = items[i];
        items[i] = items[i - 1];
        items[i - 1] = temp;
      }
    }
  }

  Emergency pop() {
    Emergency top = items[0];
    for (int i = 1; i < size; i++)
      items[i - 1] = items[i];
    size--;
    return top;
  }
  bool isEmpty() { return size == 0; }
};

void addEdge(int graph[V][V], int u, int v, int weight) {
  graph[u][v] = weight;
  graph[v][u] = weight;
}

void blockRoad(int graph[V][V], int u, int v) {
  graph[u][v] = INF;
  graph[v][u] = INF;
}

void initializeMap(int graph[V][V]) {
  for (int i = 0; i < V; i++) {
    for (int j = 0; j < V; j++) {
      if (i == j)
        graph[i][j] = 0;
      else
        graph[i][j] = INF;
    }
  }

  addEdge(graph, 0, 1, 8);
  addEdge(graph, 0, 3, 12);
  addEdge(graph, 0, 2, 15);
  addEdge(graph, 1, 3, 5);
  addEdge(graph, 1, 5, 14);
  addEdge(graph, 2, 3, 6);
  addEdge(graph, 2, 6, 20);
  addEdge(graph, 3, 7, 10);
  addEdge(graph, 4, 3, 8);
  addEdge(graph, 4, 7, 7);
  addEdge(graph, 4, 9, 11);
  addEdge(graph, 5, 8, 9);
  addEdge(graph, 5, 7, 16);
  addEdge(graph, 6, 4, 12);
  addEdge(graph, 6, 11, 22);
  addEdge(graph, 7, 8, 4);
  addEdge(graph, 7, 12, 18);
  addEdge(graph, 7, 9, 6);
  addEdge(graph, 8, 10, 15);
  addEdge(graph, 8, 12, 10);
  addEdge(graph, 9, 12, 8);
  addEdge(graph, 9, 11, 14);
  addEdge(graph, 10, 13, 9);
  addEdge(graph, 11, 14, 12);
  addEdge(graph, 12, 13, 11);
  addEdge(graph, 12, 14, 13);
  addEdge(graph, 13, 14, 7);
}

int getMinNode(int dist[], bool visited[]) {
  int min = INF, min_index = -1;
  for (int v = 0; v < V; v++) {
    if (!visited[v] && dist[v] <= min) {
      min = dist[v];
      min_index = v;
    }
  }
  return min_index;
}

void dijkstra(int graph[V][V], int src, int dest, int ambId) {
  int dist[V];
  bool visited[V];
  int parent[V];

  for (int i = 0; i < V; i++) {
    dist[i] = INF;
    visited[i] = false;
    parent[i] = -1;
  }
  dist[src] = 0;

  for (int count = 0; count < V - 1; count++) {
    int u = getMinNode(dist, visited);
    if (u == -1 || u == dest)
      break;
    visited[u] = true;

    for (int v = 0; v < V; v++) {
      if (!visited[v] && graph[u][v] != INF &&
          dist[u] + graph[u][v] < dist[v]) {
        dist[v] = dist[u] + graph[u][v];
        parent[v] = u;
      }
    }
  }

  cout << "Ambulance " << ambId << " reached Node " << dest
       << " (Cost: " << dist[dest] << ")\n";
}

int main() {
  int mapGraph[V][V];
  initializeMap(mapGraph);

  blockRoad(mapGraph, 0, 3);
  cout << "--- ROAD BLOCKED: 0 to 3 ---\n";

  AmbulanceQueue ambQueue;
  ambQueue.push(1);
  ambQueue.push(2);
  ambQueue.push(3);

  PriorityQueue pq;
  pq.push(14, 3);
  pq.push(7, 1);
  pq.push(10, 2);

  cout << "--- DISPATCHING AMBULANCES ---\n";
  while (!pq.isEmpty() && !ambQueue.isEmpty()) {
    Emergency e = pq.pop();
    int ambId = ambQueue.pop();
    dijkstra(mapGraph, 0, e.dest, ambId);
  }

  return 0;
}
