export class Connection {
  constructor(id, fromNode, fromPort, toNode, toPort, bridge) {
    this.id = id;
    this.fromNode = fromNode;
    this.fromPort = fromPort;
    this.toNode = toNode;
    this.toPort = toPort;
    this.bridge = bridge;
  }
}
