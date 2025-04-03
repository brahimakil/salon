// Global variables
let services = [];
let categories = [];
let currentService = null;
let currentEditIndex = null;
let currentPriceType = 'fixed';
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let data = {}; // Store the complete data object
let isReorganizing = false; // Flag to prevent multiple auto-saves during reorganization

// API endpoints
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8888/.netlify/functions' 
  : '/.netlify/functions';

// DOM Elements
const loginContainer = document.querySelector('.login-container');
const adminPanel = document.querySelector('.admin-panel');
const loginForm = document.querySelector('.login-form');
const errorMessage = document.querySelector('.error-message');
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');
const servicesList = document.querySelector('.services-list');
const categoriesList = document.querySelector('.categories-list');
const addServiceBtn = document.querySelector('.add-service');
const addCategoryBtn = document.querySelector('.add-category');
const logoutBtn = document.querySelector('.logout-btn');
const serviceModal = document.getElementById('service-modal');
const categoryModal = document.getElementById('category-modal');
const serviceForm = document.getElementById('service-form');
const categoryForm = document.getElementById('category-form');
const successMessage = document.querySelector('.success-message');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    initializeApp();
    
    // Add event listeners
    loginForm?.addEventListener('submit', handleLogin);
    navItems.forEach(item => item.addEventListener('click', handleNavigation));
    addServiceBtn?.addEventListener('click', () => openServiceModal());
    addCategoryBtn?.addEventListener('click', () => openCategoryModal());
    logoutBtn?.addEventListener('click', handleLogout);
    serviceForm?.addEventListener('submit', handleServiceSubmit);
    categoryForm?.addEventListener('submit', handleCategorySubmit);
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn?.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Apply theme
    applyTheme();
});

// Initialize application
async function initializeApp() {
    try {
        // Check if user is logged in
        if (localStorage.getItem('adminSession') === 'active') {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'grid';
            await loadData();
            
            // Set initial button visibility based on default view (services)
            if (addServiceBtn && addCategoryBtn) {
                addServiceBtn.style.display = 'flex';
                addCategoryBtn.style.display = 'none';
            }
        } else {
            loginContainer.style.display = 'block';
            adminPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('Error initializing application', false);
    }
}

// Load data from server
async function loadData() {
    try {
        // Try to fetch from data.json first
        const response = await fetch('data.json');
        if (response.ok) {
            const jsonData = await response.json();
            services = Array.isArray(jsonData.services) ? jsonData.services : [];
            categories = Array.isArray(jsonData.categories) ? jsonData.categories : [];
        } else {
            // If fetch fails, try localStorage
            const localData = localStorage.getItem('salonData');
            if (localData) {
                const jsonData = JSON.parse(localData);
                services = Array.isArray(jsonData.services) ? jsonData.services : [];
                categories = Array.isArray(jsonData.categories) ? jsonData.categories : [];
            }
        }
        
        // Save to localStorage as backup
        localStorage.setItem('salonData', JSON.stringify({ services, categories }));
        
        renderServices();
        renderCategories();
        updateCategorySelects();
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data', false);
    }
}

// Save data to server
async function saveData() {
    try {
        const dataToSave = {
            services: services,
            categories: categories,
            credentials: {
                username: 'admin',
                password: 'admin'
            }
        };

        // Save to localStorage
        localStorage.setItem('salonData', JSON.stringify(dataToSave));

        // Save to data.json using fetch with POST method
        const response = await fetch('data.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave, null, 2)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save to server');
        }
        
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        // Even if server save fails, data is in localStorage
        return true;
    }
}

// Render services list
function renderServices() {
    if (!servicesList) return;
    
    servicesList.innerHTML = services.map(service => `
        <div class="service-item">
            <div class="service-info">
                <div class="service-name">${service.name}</div>
                ${service.category ? `<div class="service-category">${service.category}</div>` : ''}
                <div class="service-price">${service.price}</div>
            </div>
            <div class="service-actions">
                <button class="action-btn edit" onclick="editService('${service.name}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteService('${service.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Render categories list
function renderCategories() {
    if (!categoriesList) return;
    
    categoriesList.innerHTML = categories.map(category => `
        <div class="category-item">
            <div class="category-info">
                <div class="category-name">${category}</div>
                <div class="category-count">${services.filter(s => s.category === category).length} services</div>
            </div>
            <div class="category-actions">
                <button class="action-btn delete" onclick="deleteCategory('${category}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Update category select elements
function updateCategorySelects() {
    const categorySelect = document.getElementById('service-category');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = `
        <option value="">Select Category</option>
        ${categories.map(category => `
            <option value="${category}">${category}</option>
        `).join('')}
    `;
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === 'admin' && password === 'admin') {
        localStorage.setItem('adminSession', 'active');
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'grid';
        await loadData();
    } else {
        errorMessage.textContent = 'Invalid username or password';
        errorMessage.style.display = 'block';
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('adminSession');
    loginContainer.style.display = 'block';
    adminPanel.style.display = 'none';
}

// Handle navigation
function handleNavigation(e) {
    const view = e.target.closest('.nav-item').dataset.view;
    
    // Update active nav item
    navItems.forEach(item => item.classList.remove('active'));
    e.target.closest('.nav-item').classList.add('active');
    
    // Update visible section
    viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${view}-view`) {
            section.classList.add('active');
        }
    });

    // Update title and buttons visibility
    document.querySelector('.admin-title').textContent = 
        view.charAt(0).toUpperCase() + view.slice(1) + ' Management';
    
    // Show/hide appropriate add buttons
    if (addServiceBtn && addCategoryBtn) {
        if (view === 'services') {
            addServiceBtn.style.display = 'flex';
            addCategoryBtn.style.display = 'none';
        } else if (view === 'categories') {
            addServiceBtn.style.display = 'none';
            addCategoryBtn.style.display = 'flex';
        } else {
            // For other views (like settings), hide both
            addServiceBtn.style.display = 'none';
            addCategoryBtn.style.display = 'none';
        }
    }
}

// Delete service
async function deleteService(serviceName) {
    if (confirm('Are you sure you want to delete this service?')) {
        services = services.filter(s => s.name !== serviceName);
        await saveData();
        renderServices();
        showMessage('Service deleted successfully');
    }
}

// Delete category
async function deleteCategory(categoryName) {
    if (confirm('Are you sure you want to delete this category? Services in this category will become uncategorized.')) {
        categories = categories.filter(c => c !== categoryName);
        services = services.map(service => {
            if (service.category === categoryName) {
                return { ...service, category: '' };
            }
            return service;
        });
        await saveData();
        renderCategories();
        renderServices();
        updateCategorySelects();
        showMessage('Category deleted successfully');
    }
}

// Show message
function showMessage(text, isSuccess = true) {
    const messageElement = document.querySelector('.success-message');
    if (!messageElement) return;
    
    messageElement.textContent = text;
    messageElement.style.backgroundColor = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 3000);
}

// Open service modal
function openServiceModal(service = null) {
    currentService = service;
    const modal = document.getElementById('service-modal');
    const form = document.getElementById('service-form');
    const title = modal.querySelector('.modal-title');
    
    title.textContent = service ? 'Edit Service' : 'Add Service';
    
    if (service) {
        const existingService = services.find(s => s.name === service);
        if (existingService) {
            form.querySelector('#service-name').value = existingService.name;
            form.querySelector('#service-category').value = existingService.category || '';
            form.querySelector('#service-price').value = existingService.price || '';
        }
    } else {
        form.reset();
    }
    
    modal.style.display = 'flex';
}

// Category modal functions
function openCategoryModal() {
    if (!categoryModal || !categoryForm) return;
    categoryForm.reset();
    categoryModal.style.display = 'flex';
}

// Handle service form submit
async function handleServiceSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const name = form.querySelector('#service-name').value.trim();
    const category = form.querySelector('#service-category').value;
    const price = form.querySelector('#service-price').value.trim();
    
    if (!name || !price) {
        showMessage('Please fill in all required fields', false);
        return;
    }

    const newService = {
        name: name,
        category: category,
        price: price
    };
    
    if (currentService) {
        // Edit existing service
        const index = services.findIndex(s => s.name === currentService);
        if (index !== -1) {
            services[index] = newService;
        }
    } else {
        // Add new service
        services.push(newService);
    }
    
    await saveData();
    renderServices();
    document.getElementById('service-modal').style.display = 'none';
    showMessage(currentService ? 'Service updated successfully' : 'Service added successfully');
    currentService = null;
}

// Edit service
function editService(serviceName) {
    openServiceModal(serviceName);
}

// Handle category form submit
async function handleCategorySubmit(e) {
    e.preventDefault();
    const categoryName = document.getElementById('category-name').value.trim();
    
    if (!categoryName) {
        showMessage('Please enter a category name', false);
        return;
    }
    
    if (!categories.includes(categoryName)) {
        categories.push(categoryName);
        await saveData();
        categoryModal.style.display = 'none';
        renderCategories();
        updateCategorySelects();
        showMessage('Category added successfully');
    } else {
        showMessage('Category already exists', false);
    }
}

// Reorganize services to include automatic spacers between categories
function reorganizeServicesWithSpacers() {
    isReorganizing = true;
    
    // Track current and previous categories
    let currentCategory = null;
    let previousCategory = null;
    let reorganizedServices = [];
    
    // First pass: Remove all existing spacers
    const servicesWithoutSpacers = services.filter(item => !item.spacer);
    
    // Sort services by category to ensure they're grouped properly
    servicesWithoutSpacers.sort((a, b) => {
        const catA = a.category || 'Uncategorized';
        const catB = b.category || 'Uncategorized';
        return catA.localeCompare(catB);
    });
    
    // Second pass: Add services with spacers between categories
    servicesWithoutSpacers.forEach((item, index) => {
        currentCategory = item.category || 'Uncategorized';
        
        // If we're switching to a new category and it's not the first one, add a spacer
        if (currentCategory !== previousCategory && previousCategory !== null) {
            reorganizedServices.push({ spacer: true });
        }
        
        reorganizedServices.push(item);
        previousCategory = currentCategory;
    });
    
    services = reorganizedServices;
    isReorganizing = false;
}

// Show success message
function showSuccessMessage(message) {
    const successMessage = document.getElementById('success-message');
    successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successMessage.style.backgroundColor = 'var(--success-color)';
    successMessage.style.display = 'flex';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// Show error message
function showErrorMessage(message) {
    const successMessage = document.getElementById('success-message');
    successMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    successMessage.style.backgroundColor = 'var(--error-color)';
    successMessage.style.display = 'flex';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
        successMessage.style.backgroundColor = 'var(--success-color)';
    }, 3000);
}

// Clean up existing problematic data
function cleanupExistingData() {
    if (!services || !Array.isArray(services)) return;
    
    let dataChanged = false;
    
    services.forEach(service => {
        // Skip spacers
        if (service.spacer) return;
        
        // Fix extremely long prices
        if (service.price && service.price.length > 10) {
            service.price = service.price.substring(0, 10) + '$';
            if (service.price.includes('/nail')) {
                service.price = service.price.substring(0, 7) + '$ /nail';
            }
            dataChanged = true;
        }
        
        // Ensure prices have $ symbol
        if (service.price && !service.price.includes('$') && !service.price.toLowerCase().includes('half')) {
            service.price = `${service.price}$`;
            dataChanged = true;
        }
    });
    
    // Save if we made any changes
    if (dataChanged) {
        saveData(data);
    }
}

// Toggle dark/light mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    
    applyTheme();
}

// Apply the current theme
function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
} 