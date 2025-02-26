import { handlePosts, handleNewPost } from './loadCorrectPage.js';

export function connectToWebSocket(u, p) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://sokt.fraudulent.loan/');

        ws.onopen = () => {
            ws.send(JSON.stringify({
                command: 'login_pswd',
                username: u,
                password: p,
                client: 'DeerChat'
            }));
            resolve(ws);
        };

        ws.onmessage = (e) => {
             try {
            const r = JSON.parse(e.data);
            if (r.listener === 'RegisterLoginPswdListener' && !r.error) {
                localStorage.setItem('token', r.token);
                const d = JSON.parse(localStorage.getItem('userData')) || {};
                if (d[r.user.username]) { d[r.user.username].token = r.token; }
                localStorage.setItem('userData', JSON.stringify(d));
            } else if (r.command === 'greet') {
                handlePosts(r.messages)
                r.ulist && console.log('Received user list:', r.ulist);
            } else if (r.command === 'new_post') {
                handleNewPost(r.data);
            } else if (r.command === 'ulist') {
                console.log('Received user list:', r.ulist);
            } else if (r.error) {
                console.error('Error:', r);
            } else {
                console.log(r);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    };

        ws.onerror = (e) => {
            console.error('WebSocket error:', e);
            reject(e); // Reject the promise on error
        };
        ws.onclose = (e) => console.log('WebSocket connection closed:', e);
    });
}
