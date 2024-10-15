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

    function copyToClipboard(text) {
        console.log('Attempting to copy:', text);
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
            alert('FSD number copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy FSD number. Please try again.');
        });
    }

    function updateDisplay(data) {
        console.log('Updating display with data:', data);
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
                        .fsd-number { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
                        .copy-button { padding: 5px 10px; margin-left: 10px; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <h2>Extracted Data</h2>
                    <div class="fsd-number">
                        FSD Number: ${data.fsdNumber}
                        <button class="copy-button" data-fsd="${data.fsdNumber}">Copy</button>
                    </div>
                    <p><strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a></p>
                    <p><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                    
                    <h3>Fields</h3>
            `;

            const excludeFields = ['url', 'timestamp', 'fsdNumber'];
            for (let [key, value] of Object.entries(data)) {
                if (!excludeFields.includes(key)) {
                    html += `<p><strong>${key}:</strong></p><pre>${value}</pre>`;
                }
            }

            html += '</body></html>';
            const iframe = createIframe(html);
            dataDisplay.innerHTML = '';
            dataDisplay.appendChild(iframe);

            iframe.onload = function() {
                this.style.height = this.contentWindow.document.body.scrollHeight + 'px';
                
                // Add event listener to the copy button
                const copyButton = iframe.contentDocument.querySelector('.copy-button');
                if (copyButton) {
                    copyButton.addEventListener('click', function() {
                        const fsd = this.getAttribute('data-fsd');
                        console.log('Copy button clicked, FSD:', fsd);
                        copyToClipboard(fsd);
                    });
                }
            };
        } else {
            dataDisplay.textContent = 'No data extracted yet. Click "Extract Data" to fetch information.';
        }
    }

    extractButton.addEventListener('click', function() {
        console.log('Extract button clicked');
        dataDisplay.textContent = 'Extracting data...';
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "extract"}, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError);
                    let errorMessage = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
                    dataDisplay.textContent = `Error: ${errorMessage}. Make sure you're on an Insightly or SunRun page.`;
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
    });

    // Initial display
    updateDisplay(null);
});