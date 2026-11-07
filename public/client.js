// The whole client: show each frame the server sends, and send the index of a clicked cell.
const life = document.getElementById("life");
let socket;

const connect = () => {
  socket = new WebSocket(new URL("/live", location.href.replace(/^http/, "ws")));
  socket.onmessage = (event) => {
    life.innerHTML = event.data;
  };
  socket.onclose = () => setTimeout(connect, 2000);
};
connect();

life.addEventListener("click", (event) => {
  const grid = event.target.parentElement;
  if (grid?.id === "b" && socket.readyState === WebSocket.OPEN) {
    socket.send(String([...grid.children].indexOf(event.target)));
  }
});
