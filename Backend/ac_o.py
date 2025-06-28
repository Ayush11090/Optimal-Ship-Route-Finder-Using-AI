
import networkx as nx

def AntColonyOptimizer(optimized_subgraph, start_node, end_node, weight='weight'):
    optimized_path = nx.dijkstra_path(optimized_subgraph, start_node, end_node, weight)
    return optimized_path
    