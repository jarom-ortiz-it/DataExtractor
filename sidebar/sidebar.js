//File: sidebar/sidebar.js
document.addEventListener('DOMContentLoaded', function() {
    const extractButton = document.getElementById('extractButton');
    const dataDisplay = document.getElementById('dataDisplay');

    console.log('Sidebar script loaded');

    function createIframe(content) {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = content;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        return iframe;
    }

    function updateDisplay(data) {
        console.log('Updating display');
        if (data) {
            let html = `
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 10px; }
                        h2 { color: #333; }
                        h3 { color: #333; margin-top: 20px; }
                        pre { white-space: pre-wrap; word-wrap: break-word; }
                    </style>
                </head>
                <body>
                    <h2>Extracted Data</h2>
                    <p><strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a></p>
                    <p><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                    
                    <h3>Fields</h3>
            `;

            const excludeFields = ['url', 'timestamp'];
            for (let [key, value] of Object.entries(data)) {
                if (!excludeFields.includes(key)) {
                    html += `<p><strong>${key}:</strong></p><pre>${value}</pre>`;
                }
            }

            html += '</body></html>';
            const iframe = createIframe(html);
            dataDisplay.innerHTML = '';
            dataDisplay.appendChild(iframe);

            // Set iframe height to match content
            iframe.onload = function() {
                this.style.height = this.contentWindow.document.body.scrollHeight + 'px';
            };
        } else {
            dataDisplay.textContent = 'No data extracted yet. Click "Extract Data" to fetch information.';
        }
    }

    extractButton.addEventListener('click', function() {
        console.log('Extract button clicked');
        dataDisplay.textContent = 'Extracting data...';
        chrome.runtime.sendMessage({action: "extract"}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                dataDisplay.textContent = `Error: ${chrome.runtime.lastError.message}. Make sure you're on an Insightly or SunRun page.`;
                return;
            }
            console.log('Received response:', response);
            if (response && response.data) {
                updateDisplay(response.data);
            } else if (response && response.error) {
                console.error('Error:', response.error);
                if (response.error === "Fields not found") {
                    dataDisplay.textContent = 'Some fields could not be found. The data might not be fully loaded. Please wait a moment and try again.';
                } else {
                    dataDisplay.textContent = `Error: ${response.error}. Please make sure you're on a valid Insightly or SunRun page.`;
                }
            } else {
                console.error('No response received');
                dataDisplay.textContent = 'No data could be extracted. Please make sure you\'re on an Insightly project or SunRun partner page and try again.';
            }
        });
    });

    // Initial display
    updateDisplay(null);
});