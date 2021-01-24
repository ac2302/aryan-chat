const socket = io();

const username = document.getElementById("username").innerText;
const hall = document.getElementById("hall-name").innerText;

socket.emit("greeting", {
	name: username,
	hall: hall,
});
