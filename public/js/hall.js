const socket = io();

const username = document.getElementById("username").innerText;
const hall = document.getElementById("hall-name").innerText;
const messageContainer = document.getElementById("messages-scroll");

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
	displayMessage(message);
});

// displaying message
function displayMessage(message) {
	const div = document.createElement("div");
	div.classList.add("message");
	div.innerHTML = `
        <div class="sender">${message.username}</div>
		<p>${message.message}</p>
    `;
	messageContainer.appendChild(div);
}
