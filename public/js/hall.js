const socket = io();

const username = document.getElementById("username").innerText;
const hall = document.getElementById("hall-name").innerText;

socket.emit("greeting", {
	name: username,
	hall: hall,
});

// when user sends
document.getElementById("message-form").addEventListener("submit", (e) => {
	e.preventDefault();
	const message = e.target.elements.msg.value;
	e.target.elements.msg.value = "";
	socket.emit("messageSend", { username, message });
});

// recieving message
socket.on("messageRecieve", (message) => {
	console.log(message);
});
