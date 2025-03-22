/**
 * ansible-multi-host-output.js
 * Enhances Ansible baseline playbook output visibility for multiple hosts
 */

(function() {
    console.log("Initializing multi-host output enhancement for Ansible baseline playbooks...");

    // Store original functions
    const originalMonitorPlaybookExecution = window.monitorPlaybookExecution;
    const originalProcessAnsibleOutput = window.processAnsibleOutput || function() {};

    // Global state for multi-host tracking
    const multiHostState = {
        jobOutputs: new Map(), // Map jobId -> { host: output }
        activeMonitors: new Map() // Map jobId -> intervalId
    };

    /**
     * Enhanced monitorPlaybookExecution function to handle multiple hosts
     * @param {string} jobId - The job ID
     * @param {HTMLElement} card - The execution card element
     */
    window.monitorPlaybookExecution = function(jobId, card) {
        console.log(`Enhanced monitoring started for job: ${jobId} with multi-host support`);

        const playbookName = card?.dataset?.playbookName || '';
        const isBaseline = playbookName.toLowerCase().includes('baseline') || 
                         playbookName.toLowerCase().includes('configuracao-base');

        // Get UI elements
        const progressBar = card.querySelector('.progress-bar');
        const outputDiv = card.querySelector('.ansible-output');
        const statusDiv = card.querySelector('.task-status');

        // Initialize output structure
        if (outputDiv) {
            outputDiv.innerHTML = `
                <div class="multi-host-output-container">
                    <div class="multi-host-loading">
                        <div class="ansible-spinner"></div>
                        <span>Loading multi-host execution...</span>
                    </div>
                    <div class="host-outputs"></div>
                </div>
            `;
            outputDiv.style.display = 'block';
        }

        // Cleanup previous monitoring
        if (multiHostState.activeMonitors.has(jobId)) {
            clearInterval(multiHostState.activeMonitors.get(jobId));
            multiHostState.activeMonitors.delete(jobId);
        }

        // Initialize job state
        if (!multiHostState.jobOutputs.has(jobId)) {
            multiHostState.jobOutputs.set(jobId, new Map());
        }

        // Update function
        function updateMultiHostOutput() {
            fetch(`/api/status/${jobId}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    // Update progress
                    if (progressBar) {
                        progressBar.style.width = `${data.progress || 0}%`;
                    }

                    // Update status
                    if (statusDiv) {
                        statusDiv.textContent = {
                            'running': 'Executing on multiple hosts...',
                            'completed': 'Completed across all hosts',
                            'failed': 'Failed on one or more hosts',
                            'cancelled': 'Cancelled'
                        }[data.status] || data.status;
                        statusDiv.className = `task-status ${data.status}`;
                    }

                    // Process multi-host output
                    if (data.output && outputDiv) {
                        processMultiHostOutput(data.output, outputDiv, jobId, isBaseline);
                    }

                    // Handle completion
                    if (data.status !== 'running') {
                        if (multiHostState.activeMonitors.has(jobId)) {
                            clearInterval(multiHostState.activeMonitors.get(jobId));
                            multiHostState.activeMonitors.delete(jobId);
                        }

                        const loadingDiv = outputDiv.querySelector('.multi-host-loading');
                        if (loadingDiv) {
                            loadingDiv.innerHTML = `
                                <div class="completion-message ${data.status}">
                                    <svg class="status-icon" viewBox="0 0 24 24" width="16" height="16">
                                        ${data.status === 'completed' 
                                            ? '<path d="M20 6L9 17l-5-5"></path>'
                                            : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
                                    </svg>
                                    <span>${data.status === 'completed' 
                                        ? 'Execution completed across all hosts' 
                                        : 'Execution terminated'}</span>
                                </div>
                            `;
                        }
                    }
                })
                .catch(error => {
                    console.error(`Error monitoring job ${jobId}:`, error);
                    if (statusDiv) {
                        statusDiv.textContent = 'Error fetching status';
                        statusDiv.className = 'task-status error';
                    }
                });
        }

        // Initial update
        updateMultiHostOutput();

        // Set up periodic updates
        const intervalId = setInterval(updateMultiHostOutput, 2000);
        multiHostState.activeMonitors.set(jobId, intervalId);

        // Call original function for compatibility
        if (originalMonitorPlaybookExecution) {
            originalMonitorPlaybookExecution(jobId, card);
        }
    };

    /**
     * Process and display output for multiple hosts
     * @param {string} output - Raw Ansible output
     * @param {HTMLElement} outputDiv - Output container
     * @param {string} jobId - Job ID
     * @param {boolean} isBaseline - Whether this is a baseline playbook
     */
    function processMultiHostOutput(output, outputDiv, jobId, isBaseline) {
        const hostOutputsContainer = outputDiv.querySelector('.host-outputs');
        if (!hostOutputsContainer) return;

        // Split output into lines
        const lines = output.split('\n');
        let currentHost = null;
        let hostOutputMap = multiHostState.jobOutputs.get(jobId);
        let buffer = '';

        // Parse output to separate by host
        for (const line of lines) {
            const hostMatch = line.match(/^\s*([a-zA-Z0-9-_.]+)\s*\|/);
            if (hostMatch) {
                // Save previous host's buffer
                if (currentHost && buffer) {
                    hostOutputMap.set(currentHost, (hostOutputMap.get(currentHost) || '') + buffer);
                    buffer = '';
                }
                currentHost = hostMatch[1];
            }
            if (currentHost) {
                buffer += line + '\n';
            }
        }
        // Save last buffer
        if (currentHost && buffer) {
            hostOutputMap.set(currentHost, (hostOutputMap.get(currentHost) || '') + buffer);
        }

        // Generate HTML for each host's output
        let html = '';
        for (const [host, hostOutput] of hostOutputMap) {
            const formattedOutput = isBaseline 
                ? formatBaselineOutput(hostOutput, jobId, host)
                : formatStandardOutput(hostOutput, host);
            html += `
                <div class="host-output-section" data-host="${host}">
                    <div class="host-output-header">
                        <h4>Host: ${escapeHtml(host)}</h4>
                        <button class="toggle-host-output" data-host="${host}">
                            ${hostOutputsContainer.querySelector(`.host-output-section[data-host="${host}"] .host-output-content`)?.style.display === 'none' 
                                ? 'Show' : 'Hide'}
                        </button>
                    </div>
                    <div class="host-output-content">${formattedOutput}</div>
                </div>
            `;
        }

        hostOutputsContainer.innerHTML = html;

        // Add toggle functionality
        hostOutputsContainer.querySelectorAll('.toggle-host-output').forEach(btn => {
            btn.addEventListener('click', () => {
                const host = btn.dataset.host;
                const content = hostOutputsContainer.querySelector(`.host-output-section[data-host="${host}"] .host-output-content`);
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                btn.textContent = isHidden ? 'Hide' : 'Show';
            });
        });

        // Auto-scroll to bottom
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    /**
     * Format baseline output for a specific host
     * @param {string} output - Raw output
     * @param {string} jobId - Job ID
     * @param {string} host - Host name
     * @returns {string} Formatted HTML
     */
    function formatBaselineOutput(output, jobId, host) {
        if (!output) return `<div class="no-output">No output yet for ${escapeHtml(host)}</div>`;

        const lines = output.split('\n');
        let html = `<div class="baseline-host-output">`;
        let inTask = false;
        let taskName = '';

        for (const line of lines) {
            if (line.startsWith('TASK [')) {
                if (inTask) html += '</div>';
                taskName = line.match(/TASK \[(.*?)\]/)[1];
                html += `
                    <div class="task-section">
                        <div class="task-title">${escapeHtml(taskName)}</div>
                `;
                inTask = true;
            } else if (line.match(/^(ok|changed|failed|skipping|fatal|unreachable):/)) {
                const status = line.match(/^(ok|changed|failed|skipping|fatal|unreachable):/)[1];
                html += `<div class="task-result ${status}">${escapeHtml(line)}</div>`;
            } else if (inTask && line.trim()) {
                html += `<div class="task-line">${escapeHtml(line)}</div>`;
            }
        }
        if (inTask) html += '</div>';
        html += '</div>';
        return html;
    }

    /**
     * Format standard output for a specific host
     * @param {string} output - Raw output
     * @param {string} host - Host name
     * @returns {string} Formatted HTML
     */
    function formatStandardOutput(output, host) {
        return output 
            ? `<pre class="standard-output">${escapeHtml(output)}</pre>`
            : `<div class="no-output">No output yet for ${escapeHtml(host)}</div>`;
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Add required styles
     */
    function addStyles() {
        if (document.getElementById('multi-host-output-styles')) return;

        const style = document.createElement('style');
        style.id = 'multi-host-output-styles';
        style.textContent = `
            .multi-host-output-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 10px;
            }
            .multi-host-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #252526;
                border-radius: 4px;
            }
            .host-outputs {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .host-output-section {
                background: #2d2d2d;
                border: 1px solid #333;
                border-radius: 4px;
                overflow: hidden;
            }
            .host-output-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #333;
                color: #9cdcfe;
            }
            .host-output-header h4 {
                margin: 0;
                font-size: 14px;
            }
            .toggle-host-output {
                background: #444;
                border: none;
                color: #fff;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
            }
            .host-output-content {
                padding: 8px;
                font-family: monospace;
                font-size: 12px;
                color: #d4d4d4;
            }
            .baseline-host-output {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .task-section {
                background: #1e1e1e;
                padding: 6px;
                border-radius: 3px;
            }
            .task-title {
                color: #569cd6;
                font-weight: bold;
                margin-bottom: 4px;
            }
            .task-result.ok { color: #4CAF50; }
            .task-result.changed { color: #FF9800; }
            .task-result.failed, .task-result.fatal { color: #F44336; }
            .task-result.skipping { color: #9e9e9e; }
            .task-line { color: #bbb; }
            .standard-output {
                white-space: pre-wrap;
                margin: 0;
            }
            .no-output {
                color: #9e9e9e;
                font-style: italic;
            }
            .completion-message {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .completion-message.completed { color: #4CAF50; }
            .completion-message.failed { color: #F44336; }
            .status-icon {
                stroke: currentColor;
                stroke-width: 2;
                fill: none;
            }
            .ansible-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(33, 150, 243, 0.3);
                border-radius: 50%;
                border-top-color: #2196F3;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize the enhancement
     */
    function init() {
        addStyles();

        // Ensure compatibility with existing cards
        document.querySelectorAll('.execution-card').forEach(card => {
            const jobId = card.dataset.jobId || card.getAttribute('data-job-id');
            if (jobId && !multiHostState.activeMonitors.has(jobId)) {
                window.monitorPlaybookExecution(jobId, card);
            }
        });

        console.log("Multi-host output enhancement initialized successfully");
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();