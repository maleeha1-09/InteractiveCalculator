// --- DOM Elements ---
const expressionDisplay = document.getElementById('expression-display');
const resultDisplay = document.getElementById('result-display');
const draggableButtons = document.querySelectorAll('.calc-button');
const savedCalculationsList = document.getElementById('saved-calculations-list');
const saveModalOverlay = document.getElementById('save-modal-overlay');
const saveTitleInput = document.getElementById('saveTitle');
const saveDescriptionTextarea = document.getElementById('saveDescription');
const tempMessageDiv = document.getElementById('temp-message');

// --- State Variables ---
let expression = []; // Array of { type: 'number'|'operator', value: string }
let result = '0';
let savedCalculations = []; // Array of { id, title, description, expression (stringified), result, timestamp }
let showSaveModal = false;
let currentDragItemId = null; // To track which saved item is being dragged

// --- Helper Functions ---

// Function to update the expression display
function renderExpression() {
    expressionDisplay.innerHTML = ''; // Clear current content
    if (expression.length === 0) {
        expressionDisplay.innerHTML = '<span class="text-gray-500 text-2xl">Drop numbers and operators here...</span>';
    } else {
        expression.forEach((item, index) => {
            const span = document.createElement('span');
            span.className = `mx-1 ${item.type === 'operator' ? 'text-orange-300' : 'text-white'}`;
            span.textContent = item.value;
            expressionDisplay.appendChild(span);
        });
    }
}

// Function to update the result display
function renderResult() {
    resultDisplay.textContent = result;
}

// Function to render the saved calculations list
function renderSavedCalculations() {
    savedCalculationsList.innerHTML = ''; // Clear current content
    if (savedCalculations.length === 0) {
        savedCalculationsList.innerHTML = '<p class="text-gray-400">No calculations saved yet.</p>';
    } else {
        // Sort by timestamp in descending order (most recent first)
        const sortedCalculations = [...savedCalculations].sort((a, b) => b.timestamp - a.timestamp);

        sortedCalculations.forEach(calc => {
            const div = document.createElement('div');
            div.className = 'saved-calc-item';
            div.setAttribute('draggable', 'true');
            div.dataset.id = calc.id; // Store ID for drag-and-drop
            div.dataset.expression = calc.expression; // Store stringified expression
            div.dataset.result = calc.result; // Store result

            div.innerHTML = `
                <div>
                    <h3 class="text-lg font-semibold text-white">${calc.title}</h3>
                    ${calc.description ? `<p class="text-sm text-gray-400 italic">${calc.description}</p>` : ''}
                    <p class="text-xl font-bold text-green-300 mt-1">= ${calc.result}</p>
                </div>
                <div class="flex space-x-2 saved-calc-buttons">
                    <button class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onclick="handleLoadCalculation('${calc.id}')" title="Load Calculation">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button class="delete-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                        onclick="handleDeleteSavedCalculation('${calc.id}')" title="Delete Calculation">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm.002 6.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            `;
            savedCalculationsList.appendChild(div);
        });
    }
    // Add drag event listeners to newly rendered saved items
    document.querySelectorAll('.saved-calc-item').forEach(item => {
        item.addEventListener('dragstart', handleSavedItemDragStart);
        item.addEventListener('dragend', handleSavedItemDragEnd);
    });
}

// Function to render the save modal
function renderModal() {
    if (showSaveModal) {
        saveModalOverlay.classList.remove('hidden');
    } else {
        saveModalOverlay.classList.add('hidden');
        saveTitleInput.value = '';
        saveDescriptionTextarea.value = '';
    }
}

// Show a temporary message
function showTemporaryMessage(msg, duration = 3000) {
    tempMessageDiv.textContent = msg;
    tempMessageDiv.classList.remove('hidden');
    tempMessageDiv.classList.remove('animate-fade-in-out'); // Reset animation
    void tempMessageDiv.offsetWidth; // Trigger reflow to restart animation
    tempMessageDiv.classList.add('animate-fade-in-out');

    setTimeout(() => {
        tempMessageDiv.classList.add('hidden');
        tempMessageDiv.textContent = '';
    }, duration);
}

// --- Core Logic to Add Items to Expression ---
function addItemToExpression(type, value) {
    const lastElement = expression[expression.length - 1];

    // Prevent consecutive operators, unless it's a negative sign at the start or after an operator
    if (type === 'operator' && lastElement && lastElement.type === 'operator' && value !== '-') {
        showTemporaryMessage("Cannot add consecutive operators (except negative sign).");
        return;
    }

    // If adding a number and the last element was a number, append it
    if (type === 'number' && lastElement && lastElement.type === 'number' && value !== '.') {
        expression[expression.length - 1].value += value;
    } else {
        expression.push({ type, value });
    }
    renderExpression();
}

// --- Event Handlers ---

// Handle drag start for number/operator buttons
draggableButtons.forEach(button => {
    button.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: e.target.dataset.type,
            value: e.target.dataset.value
        }));
        e.target.classList.add('opacity-50'); // Visual feedback for dragging
    });
    button.addEventListener('dragend', (e) => {
        e.target.classList.remove('opacity-50');
    });
    // Also handle click for number/operator buttons
    button.addEventListener('click', (e) => {
        addItemToExpression(e.target.dataset.type, e.target.dataset.value);
    });
});

// Handle drag start for saved calculation items
function handleSavedItemDragStart(e) {
    const id = e.target.dataset.id;
    const expressionData = e.target.dataset.expression;
    const resultData = e.target.dataset.result;

    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'saved-calculation',
        id: id,
        expression: expressionData,
        result: resultData
    }));
    e.target.classList.add('dragging');
    currentDragItemId = id; // Store ID of the item being dragged
}

// Handle drag end for saved calculation items
function handleSavedItemDragEnd(e) {
    e.target.classList.remove('dragging');
    currentDragItemId = null;
}

// Handle drag over on the expression display
function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    expressionDisplay.classList.add('drag-over');
}

// Handle drag leave from the expression display
function handleDragLeave(e) {
    expressionDisplay.classList.remove('drag-over');
}

// Handle drop on the expression display
function handleDrop(e) {
    e.preventDefault();
    expressionDisplay.classList.remove('drag-over');

    const data = JSON.parse(e.dataTransfer.getData('text/plain'));

    if (data.type === 'saved-calculation') {
        // If a saved calculation is dropped, load it
        handleLoadCalculation(data.id);
    } else {
        // Otherwise, add the number/operator to the expression
        addItemToExpression(data.type, data.value);
    }
}

// Clear the current expression and result
function handleClear() {
    expression = [];
    result = '0';
    renderExpression();
    renderResult();
    showTemporaryMessage("Calculator cleared!");
}

// Delete the last element from the expression
function handleDelete() {
    if (expression.length > 0) {
        expression.pop();
        renderExpression();
    }
    if (expression.length === 0) {
        result = '0';
        renderResult();
    }
    showTemporaryMessage("Last item deleted.");
}

// Evaluate the expression
function evaluateExpression() {
    if (expression.length === 0) {
        result = '0';
        renderResult();
        return;
    }

    let fullExpressionString = '';
    expression.forEach(item => {
        fullExpressionString += item.value;
    });

    try {
        // Basic validation to prevent arbitrary code execution
        if (!/^[0-9+\-*/.() ]*$/.test(fullExpressionString)) {
            throw new Error("Invalid characters in expression.");
        }

        // Use Function constructor for safer evaluation than direct eval()
        const calculated = new Function('return ' + fullExpressionString)();
        if (isNaN(calculated) || !isFinite(calculated)) {
            throw new Error("Invalid calculation result.");
        }
        result = parseFloat(calculated.toFixed(10)).toString(); // Round for precision
        renderResult();
        showTemporaryMessage("Calculation successful!");
    } catch (error) {
        console.error("Calculation error:", error);
        result = 'Error';
        renderResult();
        showTemporaryMessage("Error: " + error.message);
    }
}

// Handle saving a calculation to in-memory list
function handleSaveCalculation() {
    const title = saveTitleInput.value.trim();
    const description = saveDescriptionTextarea.value.trim();

    if (!title) {
        showTemporaryMessage("Title cannot be empty.");
        return;
    }
    if (expression.length === 0) {
        showTemporaryMessage("Cannot save empty expression.");
        return;
    }
    if (result === '0' || result === 'Error') { // Prevent saving initial 0 or error state
        showTemporaryMessage("Please calculate a valid result before saving.");
        return;
    }

    const newCalculation = {
        id: Date.now().toString(), // Simple unique ID for in-memory
        title: title,
        description: description,
        expression: JSON.stringify(expression), // Store expression array as string
        result: result,
        timestamp: new Date().getTime() // Store timestamp for sorting
    };

    savedCalculations.push(newCalculation);
    showTemporaryMessage("Calculation saved successfully (in memory)!");
    showSaveModal = false;
    renderModal(); // Hide modal and clear inputs
    renderSavedCalculations(); // Update the list
}

// Handle loading a saved calculation from in-memory list
function handleLoadCalculation(id) {
    const calcToLoad = savedCalculations.find(calc => calc.id === id);
    if (calcToLoad) {
        try {
            expression = JSON.parse(calcToLoad.expression);
            result = calcToLoad.result;
            renderExpression();
            renderResult();
            showTemporaryMessage(`Loaded: ${calcToLoad.title}`);
        } catch (error) {
            console.error("Error parsing loaded expression:", error);
            showTemporaryMessage("Failed to load calculation due to data error.");
        }
    }
}

// Handle deleting a saved calculation from in-memory list
function handleDeleteSavedCalculation(id) {
    savedCalculations = savedCalculations.filter(calc => calc.id !== id);
    renderSavedCalculations(); // Update the list
    showTemporaryMessage("Calculation deleted (from memory)!");
}

// --- Initial Render ---
// This ensures the DOM is fully loaded before trying to access elements
document.addEventListener('DOMContentLoaded', () => {
    renderExpression();
    renderResult();
    renderSavedCalculations();
    renderModal(); // Ensure modal is hidden on load
});
