import { connectToWebSocket } from './connectToWebSocket.js';
import { createPost } from './post.js';
import MarkdownIt from 'markdown-it';

let ws, user
let replies = []
let attachmentURls = []
let replies_details = document.getElementById('replies_details');

if (!localStorage.getItem('token')) { window.location.hash = '#login' }
function clearReplies() { replies = [], replies_details.innerHTML = `` }
function clearAttachmentURls() { attachmentURls = [] }

function getUserCredentials() {
    const d = JSON.parse(localStorage.getItem('userData')) || {};
    const u = Object.keys(d);
    return u.length ? { username: u[0], password: d[u[0]].password } : null;
}

export function handlePosts(posts) {
    console.log(posts)
    const postsContainer = document.getElementById('post-container');
    posts.forEach(post => {
        const postHtml = createPost(post);
        postsContainer.innerHTML += postHtml;
    });
}

export function handleNewPost(post) {
    const postsContainer = document.getElementById('post-container');
    const postHtml = createPost(post);
    postsContainer.innerHTML = postHtml + postsContainer.innerHTML;
}

export function handleUlist(ulist) {
    const ulistElement = document.getElementById('ulist');
    const users = Object.keys(ulist).map(u => {
        const client = ulist[u].client
        let title;
            if (client === 'DeerChat') {
                title='This user is using the amazing epic sauce best looking client around... DeerChat!!'
            } else {
                title=`This user is using ${client}`
            }
        return `<a class="profile-link" href="#profile?user=${u}" title="${title}">${u}</a>`
    }).join(', ');
    const userCount = Object.keys(ulist).length
    let ulistHtml;
        if (userCount > 1) { 
        ulistHtml = `(${userCount}) Users: ${users}`;
    } else {
        ulistHtml = `You are the only user online :(`
    }
    ulistElement.innerHTML = ulistHtml + `<br/>`;
}

{
const u = getUserCredentials();
if (u) {
    connectToWebSocket(u.username, u.password)
        .then((webSocket) => {
            ws = webSocket;
            console.log("WebSocket connection is open!");
        })
        .catch((error) => {
            console.error("Failed to connect to WebSocket:", error);
        });
} else {
    console.error('User data not found in localStorage.');
}
}

function sendPost() {
    let message = document.getElementById("commentbox");
    if (ws && ws.readyState === WebSocket.OPEN) {
        const postCommand = JSON.stringify({
            command: "post",
            content: message.value,
            replies: replies,
            attachments: attachmentURls
            ,
        });
        ws.send(postCommand);
        message.value = "";
        clearReplies();
        clearAttachmentURls();
    } else {
        console.error("WebSocket connection is not open.");
    }
}

function showPageFromHash() {
    let hash = window.location.hash
    if (!hash.startsWith('#')) {
      hash = hash.split('#')[1] || ''
    }
    const hashParts = hash.split('?');
    const pageId = hashParts[0].substring(1) || "home";
    const query = hashParts[1];
    const allPages = document.querySelectorAll(".page");
    allPages.forEach(page => page.classList.remove("active"));
    const pageToShow = document.getElementById(`${pageId}-page`);
    if (pageToShow) {
        pageToShow.classList.add("active");
        switch (pageId) {
            case "profile":
                loadProfilePage(query)
                break;
            case "home":
                loadHomePage();
                break;
            case "login":
                loadLoginPage()
                break;
        }
    }
    else {
        document.getElementById('not-found-page').classList.add('active');
    }
}

window.addEventListener("hashchange", showPageFromHash);
window.onload = () => showPageFromHash()

const contentDiv = document.getElementById("content");
contentDiv.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.target.matches(".profile-link")) {
        const url = event.target.getAttribute("href");
        const username = new URLSearchParams(url.split('?')[1]).get('user');
        window.location.hash = `#profile?user=${username}`;
    } else if (event.target.matches(".reply-link")) {
        const postId = event.target.getAttribute('post_id')
        replies.push(postId);
        replies_details.innerHTML = `${replies.length} Replies - <span class="link" id="clear-replies">Remove All</span>`;
        const removeAll = document.getElementById("clear-replies");
        if (removeAll) {
            removeAll.addEventListener("click", clearReplies);
        }
    } else if (event.target.matches("#clear-replies")) {
        clearReplies();
    }
});

const attachButton = document.getElementById('attach-btn')
attachButton ? document.querySelector("#attach-btn").onclick = (event) => {
    event.preventDefault()
    let result = prompt("Attach a file? (Enter a URL):")
    if (result) {
        attachmentURls.push(result)
    }
} : null;

function loadHomePage() {
    const sendButton = document.getElementById("send-button");
    if (sendButton) { sendButton.addEventListener("click", sendPost) }
    const emojiButton = document.getElementById("emoji-button");
    const emojiSelector = document.getElementById("emoji-table");
    if (emojiButton && emojiSelector) { 
        emojiButton.addEventListener("click", () => {
            emojiSelector.style.display = (emojiSelector.style.display === 'none') ? 'block' : 'none';
        });
     }
}

function loadProfilePage(query) {
    if (!query) return;
    const username = new URLSearchParams(query).get('user');
    if (!username) return;

    const contentDiv = document.getElementById("profile-page");
    if (!contentDiv) { console.error("Could not find profile-page"); return }

    const handleUserData = (userData) => {
        user = userData;
        const md = MarkdownIt();
        const mdBio = md.render(user.bio);
        const userPermissions = user.permissions.map(permission => permission).join(', ');
        console.log(user);

        const contentDiv = document.getElementById("profile-page");
        if (!contentDiv) { console.error("Could not find profile-page"); return }
        contentDiv.innerHTML = `
        <div style="display: flex">
            <div id="profile-pic">
                <img src="${user.avatar || `/assets/default.png`}"/>
            </div>
            <div style="width: 100%">
                <h1>${user.display_name}</h1>
                <small>@${user.username}</small>
                <p>Joined: ${new Date(user.created * 1000).toLocaleString()}</p>
                <p>Permissions: ${userPermissions}</p>
                <hr>
                <p>${mdBio}</p>
            </div>
        </div>
      `;
    };

    const sendGetUserCommand = () => {
        ws.send(JSON.stringify({ command: "get_user", username }));
        ws.onmessage = (e) => {
            const parsedData = JSON.parse(e.data);
            if (parsedData.user) {
                handleUserData(parsedData.user);
            }
            ws.onmessage = null;
        };
    };

    const waitForWebSocket = () => {
        if (ws?.readyState === WebSocket.OPEN) {
            console.log("WebSocket is now open.");
            sendGetUserCommand();
        } else {
            console.log("WebSocket not open, waiting for connection...");
            setTimeout(waitForWebSocket, 100);
        }
    };

    if (ws?.readyState === WebSocket.OPEN) {
        sendGetUserCommand();
    } else {
        waitForWebSocket();
    }
}

function loadLoginPage() {
    const contentDiv = document.getElementById("login-page");
    if (!contentDiv) { console.error("Could not find login-page"); return }

    contentDiv.innerHTML = `
    <h1>Login - DeerChat</h1>
    <form id="login-form" action="" method="post">
      Username:
      <br>
      <input type="text" id="username" aria required></input>
      <br>
      Password:
      <br>
      <input type="password" id="password" aria required></input>
      <br>
      <input id="submit" type="submit" name="Submit!"></input>
    </form>
  `;
  
    const storedUserData = JSON.parse(localStorage.getItem('userData')) || {};
    const loginElement = document.getElementById('login-form');

    if (loginElement) {
        document.querySelector("#submit").onclick = (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        console.log(username, password)

        ws = new WebSocket('wss://sokt.fraudulent.loan/');

        ws.onopen = () => {
            ws.send(JSON.stringify({
                command: "login_pswd",
                username: username,
                password: password,
                listener: "RegisterLoginPswdListener"
            }));
        };

        ws.onmessage = function (event) {
            console.log("Message received:", event.data);
            const response = JSON.parse(event.data);

            if (response.token && !response.error) {
                localStorage.setItem('token', response.token);
                storedUserData[username] = {
                    password: password,
                    token: response.token
                };
                localStorage.setItem('userData', JSON.stringify(storedUserData));
                ws.close();
                window.location.href = '';
            } else {
                console.error("Login failed:", response.error);
            }
        };

        ws.onerror = function (error) { console.error("WebSocket error:", error) }
        ws.onclose = function (event) { console.log("WebSocket connection closed:", event) }
    }
    }
}