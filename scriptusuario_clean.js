// Configuração do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDa_qvmvyVyJVe936hW5QoDtviIrITcvDI",
    authDomain: "ramais-63a73.firebaseapp.com",
    projectId: "ramais-63a73",
    storageBucket: "ramais-63a73.appspot.com",
    messagingSenderId: "695161860787",
    appId: "1:695161860787:web:98e73e5fc79a5cbb2f76c6",
    measurementId: "G-X3121MPE65"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variáveis globais
let people = [];

// Função para buscar pessoas do Firestore
async function fetchPeople() {
    try {
        const querySnapshot = await getDocs(collection(db, 'people'));
        people = [];
        querySnapshot.forEach((doc) => {
            people.push({ id: doc.id, ...doc.data() });
        });
        renderPeople(people);
        return Promise.resolve();
    } catch (error) {
        console.error('Error fetching people:', error);
        return Promise.reject(error);
    }
}

// Função para obter as iniciais do nome
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Função para renderizar a lista de pessoas por setor
function renderPeople(peopleList = []) {
    const ramaisContainer = document.getElementById('ramaisContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    if (!ramaisContainer) return;
    
    ramaisContainer.innerHTML = ''; // Limpa a lista antes de popular
    
    // Hide loading message when data is loaded
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }

    // Agrupa pessoas por setor
    const sectors = peopleList.reduce((acc, person) => {
        if (!person.sector) return acc; // Pula pessoas sem setor
        acc[person.sector] = acc[person.sector] || [];
        acc[person.sector].push(person);
        return acc;
    }, {});

    // Ordena os setores alfabeticamente
    const sortedSectors = Object.keys(sectors).sort();

    // Cria blocos de setor
    sortedSectors.forEach(sector => {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'ramais-container';
        
        // Nome do setor com botão de acordeão
        const sectorTitle = document.createElement('h2');
        sectorTitle.textContent = sector;
        sectorTitle.addEventListener('click', function() {
            sectorDiv.classList.toggle('collapsed');
            // Salva o estado no localStorage
            localStorage.setItem(`sector_${sector}`, sectorDiv.classList.contains('collapsed') ? 'collapsed' : 'expanded');
        });
        sectorDiv.appendChild(sectorTitle);

        // Container para os cards
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'people-cards';
        
        // Verifica se está filtrando por nome
        const isFiltering = document.getElementById('filterName').value.trim() !== '';
        
        // Se estiver filtrando, expande o setor, senão respeita o estado salvo
        if (isFiltering) {
            sectorDiv.classList.remove('collapsed');
        } else {
            const savedState = localStorage.getItem(`sector_${sector}`);
            if (savedState === 'collapsed' || savedState === null) {
                sectorDiv.classList.add('collapsed');
            }
        }

        // Cria cards para cada pessoa no setor
        sectors[sector].sort((a, b) => a.name.localeCompare(b.name)).forEach(person => {
            const card = document.createElement('div');
            card.className = 'person-card';
            
            // Iniciais ou foto do perfil
            const profilePic = document.createElement('div');
            profilePic.className = 'profile-picture';
            
            // Se a pessoa tiver uma foto (base64 ou URL), use-a, senão mostre as iniciais
            if (person.photoBase64) {
                const img = document.createElement('img');
                img.src = person.photoBase64;
                img.alt = person.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                profilePic.appendChild(img);
            } else if (person.photoUrl) {
                const img = document.createElement('img');
                img.src = person.photoUrl;
                img.alt = person.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                profilePic.appendChild(img);
            } else {
                const initials = document.createElement('div');
                initials.className = 'initials';
                initials.textContent = getInitials(person.name);
                profilePic.appendChild(initials);
            }
            
            // Adicionar badge de status
            const statusBadge = document.createElement('div');
            // Usar o status da pessoa ou 'available' como padrão
            const statusType = person.status || 'available';
            statusBadge.className = `status-badge status-${statusType}`;
            
            // Mapear status para emojis e nomes
            const statusInfo = {
                'available': { emoji: '🟢', name: 'Disponível' },
                'busy': { emoji: '🟠', name: 'Ocupado' },
                'meeting': { emoji: '🔴', name: 'Em reunião' },
                'lunch': { emoji: '🍽️', name: 'Almoço' },
                'away': { emoji: '⏰', name: 'Ausente' },
                'vacation': { emoji: '🏖️', name: 'Férias' }
            };
            
            const status = statusInfo[statusType] || { emoji: '❔', name: 'Indisponível' };
            statusBadge.innerHTML = `
                <div class="status-dot"></div>
                <span class="status-text">${status.name}</span>
            `;
            card.appendChild(statusBadge);
            
            // Nome da pessoa
            const nameElement = document.createElement('div');
            nameElement.className = 'person-name';
            nameElement.textContent = person.name;
            
            // Setor
            const sectorElement = document.createElement('div');
            sectorElement.className = 'person-sector';
            sectorElement.textContent = person.sector || 'Setor não informado';
            
            // Container para unidade e ramal
            const infoContainer = document.createElement('div');
            infoContainer.className = 'person-info-container';
            
            // Unidade
            const unitElement = document.createElement('div');
            unitElement.className = 'person-unit';
            unitElement.textContent = person.unit;
            
            // Ramal
            const extensionElement = document.createElement('div');
            extensionElement.className = 'extension';
            
            // Create phone icon
            const phoneIcon = document.createElement('i');
            phoneIcon.className = 'fas fa-phone';
            phoneIcon.style.marginRight = '5px';
            
            // Add phone icon and extension number
            extensionElement.appendChild(phoneIcon);
            extensionElement.appendChild(document.createTextNode(person.extension));
            
            // Store the original content of the extension element
            const originalExtensionContent = extensionElement.innerHTML;
            
            // Add functionality to show full number and call link when clicking on the extension
            extensionElement.style.cursor = 'pointer';
            extensionElement.title = 'Clique para ver o número completo e ligar';
            extensionElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                
                // Check if popup already exists, remove it if it does
                const existingPopup = extensionElement.querySelector('.full-number-popup');
                if (existingPopup) {
                    // Restore the original content when closing
                    extensionElement.innerHTML = originalExtensionContent;
                    existingPopup.remove();
                    return;
                }

                // Cria o popup com o número completo e link de chamada
                const fullNumber = '713879' + person.extension;
                const popup = document.createElement('div');
                popup.className = 'full-number-popup';

                // Format the phone number as (71) 3879-9759
                const formattedNumber = `(${fullNumber.substring(0, 2)}) ${fullNumber.substring(2, 6)}-${fullNumber.substring(6)}`;
                
                // Create the slide container
                const slideContainer = document.createElement('div');
                slideContainer.className = 'slide-container';
                slideContainer.style.position = 'relative';
                slideContainer.style.width = '100%';
                slideContainer.style.height = '50px';
                slideContainer.style.backgroundColor = '#4CAF50';
                slideContainer.style.borderRadius = '25px';
                slideContainer.style.overflow = 'hidden';
                slideContainer.style.cursor = 'pointer';
                
                // Create the slider
                const slider = document.createElement('div');
                slider.className = 'slider';
                
                // Add white telephone symbol
                const phoneSymbol = document.createElement('span');
                phoneSymbol.textContent = '📞'; // White telephone symbol
                phoneSymbol.style.color = 'white';
                phoneSymbol.style.fontSize = '18px';
                phoneSymbol.style.lineHeight = '1';
                phoneSymbol.style.display = 'flex';
                phoneSymbol.style.alignItems = 'center';
                phoneSymbol.style.justifyContent = 'center';
                phoneSymbol.style.width = '100%';
                phoneSymbol.style.height = '100%';
                phoneSymbol.style.filter = 'brightness(0) invert(1)';
                slider.appendChild(phoneSymbol);
                
                // Create call text
                const callText = document.createElement('div');
                callText.className = 'call-text';
                callText.textContent = 'Arraste para ligar';
                callText.style.color = 'rgba(255, 255, 255, 0.9)';
                callText.style.position = 'absolute';
                callText.style.width = '100%';
                callText.style.textAlign = 'center';
                callText.style.fontWeight = 'normal';
                callText.style.fontSize = '0.9em';
                callText.style.pointerEvents = 'none';
                
                // Create call link (invisible, will be triggered on slide)
                const callLink = document.createElement('a');
                callLink.href = `tel:${fullNumber}`;
                callLink.textContent = '';
                callLink.style.display = 'none';
                
                // Add elements to container
                slideContainer.appendChild(slider);
                slideContainer.appendChild(callText);
                slideContainer.appendChild(callLink);
                
                // Add slide functionality
                let isDragging = false;
                let startX = 0;
                let currentX = 0;
                let animationFrameId = null;
                let maxX = 0;
                
                // Add active class to card when popup is open
                card.classList.add('active');
                
                const startDrag = (e) => {
                    e.preventDefault();
                    isDragging = true;
                    startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
                    currentX = 0;
                    maxX = slideContainer.offsetWidth - slider.offsetWidth;
                    
                    // Add active state
                    slideContainer.classList.add('dragging');
                    slider.style.transition = 'none'; // Disable transition during drag
                    
                    // Add event listeners for mouse/touch move and end
                    document.addEventListener('mousemove', drag, { passive: false });
                    document.addEventListener('touchmove', drag, { passive: false });
                    document.addEventListener('mouseup', endDrag);
                    document.addEventListener('touchend', endDrag);
                    
                    // Prevent text selection during drag
                    document.body.style.userSelect = 'none';
                };
                
                const drag = (e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    
                    const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
                    const deltaX = x - startX;
                    
                    // Apply rubber band effect when dragging beyond limits
                    if (deltaX < 0) {
                        currentX = deltaX * 0.3; // Elastic effect when dragging left
                    } else if (deltaX > maxX) {
                        const extra = deltaX - maxX;
                        currentX = maxX + (extra * 0.3); // Elastic effect when dragging right
                    } else {
                        currentX = deltaX;
                    }
                    
                    // Update slider position
                    if (!animationFrameId) {
                        animationFrameId = requestAnimationFrame(() => {
                            slider.style.transform = `translateX(${currentX}px)`;
                            animationFrameId = null;
                            
                            // Change background color based on drag progress
                            const progress = Math.min(1, Math.max(0, currentX / maxX));
                            slider.style.backgroundColor = `rgb(${
                                Math.round(46 + (27 * progress))
                            }, ${
                                Math.round(125 + (32 * progress))
                            }, ${
                                Math.round(50 + (32 * progress))
                            })`;
                        });
                    }
                    
                    // If dragged to the end, trigger the call
                    if (deltaX >= maxX - 5) {
                        slider.style.transform = `translateX(${maxX}px)`;
                        slider.style.backgroundColor = '#4CAF50';
                        callLink.click();
                        endDrag();
                    }
                };
                
                const endDrag = () => {
                    if (!isDragging) return;
                    isDragging = false;
                    
                    // Re-enable transitions
                    slider.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.2s ease';
                    
                    // Remove active state
                    slideContainer.classList.remove('dragging');
                    
                    // Reset slider position with smooth animation
                    resetSlider();
                    
                    // Remove event listeners
                    document.removeEventListener('mousemove', drag);
                    document.removeEventListener('touchmove', drag);
                    document.removeEventListener('mouseup', endDrag);
                    document.removeEventListener('touchend', endDrag);
                    
                    // Re-enable text selection
                    document.body.style.userSelect = '';
                };
                
                const resetSlider = () => {
                    if (slider) {
                        slider.style.transform = 'translateX(0)';
                        slider.style.backgroundColor = '#2E7D32';
                    }
                };
                
                // Add event listeners for mouse and touch
                slideContainer.addEventListener('mousedown', startDrag);
                slideContainer.addEventListener('touchstart', startDrag, { passive: false });
                
                // Close popup when clicking outside
                const closeOnOutsideClick = (e) => {
                    if (!popup.contains(e.target) && !extensionElement.contains(e.target)) {
                        // Restore the original extension element content
                        const extensionIcon = document.createElement('i');
                        extensionIcon.className = 'fas fa-phone';
                        extensionElement.innerHTML = '';
                        extensionElement.appendChild(extensionIcon);
                        extensionElement.appendChild(document.createTextNode(` ${person.extension}`));
                        
                        // Remove the popup and clean up
                        popup.remove();
                        card.classList.remove('active');
                        document.removeEventListener('click', closeOnOutsideClick);
                        document.removeEventListener('touchstart', closeOnOutsideClick);
                    }
                };
                
                // Add click outside listener with a small delay to prevent immediate closing
                setTimeout(() => {
                    document.addEventListener('click', closeOnOutsideClick);
                    document.addEventListener('touchstart', closeOnOutsideClick, { passive: true });
                }, 100);
                
                // Create the popup content
                const popupContent = document.createElement('div');
                popupContent.style.padding = '15px';
                popupContent.style.textAlign = 'center';
                
                // Add the phone number (in white)
                const numberDisplay = document.createElement('div');
                numberDisplay.textContent = formattedNumber;
                numberDisplay.style.color = 'white';
                numberDisplay.style.fontSize = '18px';
                numberDisplay.style.marginBottom = '15px';
                numberDisplay.style.fontWeight = 'bold';
                
                // Add elements to popup
                popupContent.appendChild(numberDisplay);
                popupContent.appendChild(slideContainer);
                popup.appendChild(popupContent);
                callLink.insertBefore(phoneIcon, callLink.firstChild);
                callLink.style.fontWeight = 'bold';
                
                // Hover effect
                callLink.onmouseover = () => {
                    callLink.style.backgroundColor = '#C8E6C9';
                };
                callLink.onmouseout = () => {
                    callLink.style.backgroundColor = '#E8F5E9';
                };

                popup.appendChild(callLink);

                extensionElement.appendChild(popup);
            });
            
            // Adiciona unidade e ramal ao container
            infoContainer.appendChild(unitElement);
            infoContainer.appendChild(extensionElement);
            
            // Adiciona todos os elementos ao card
            card.appendChild(profilePic);
            card.appendChild(nameElement);
            card.appendChild(sectorElement);
            card.appendChild(infoContainer);
            
            cardsContainer.appendChild(card);
        });
        
        sectorDiv.appendChild(cardsContainer);
        ramaisContainer.appendChild(sectorDiv);
    });
}

// Função para aplicar filtros em tempo real
window.applyFilters = function() {
    const nameFilter = document.getElementById('filterName').value.toLowerCase();
    const unitFilter = document.getElementById('filterUnit').value;

    const filteredPeople = people.filter(person => {
        const matchesName = person.name.toLowerCase().includes(nameFilter);
        const matchesUnit = !unitFilter || person.unit === unitFilter;

        return matchesName && matchesUnit;
    });
    
    // Renderiza as pessoas filtradas
    renderPeople(filteredPeople);
    
    // Se não houver resultados, mostra uma mensagem
    if (filteredPeople.length === 0) {
        const ramaisContainer = document.getElementById('ramaisContainer');
        ramaisContainer.innerHTML = ''; // Garante que o container está vazio
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'Nenhum resultado encontrado';
        ramaisContainer.appendChild(noResults);
    }
};

// Função para atualizar o seletor de unidades
function updateUnitSelector() {
    const unitSelect = document.getElementById('filterUnit');
    const unitSelector = document.querySelector('.unit-selector');
    
    // Remove todas as opções
    unitSelect.innerHTML = '';
    
    // Se não houver pessoas, mantém apenas a opção padrão
    if (people.length === 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione Unidade';
        unitSelect.appendChild(defaultOption);
        unitSelector.classList.remove('has-multiple');
        return;
    }
    
    // Obtém unidades únicas
    const units = [...new Set(people.map(person => person.unit).filter(Boolean))];
    
    // Se houver apenas uma unidade, seleciona ela automaticamente
    if (units.length === 1) {
        // Adiciona apenas a unidade disponível
        const option = document.createElement('option');
        option.value = units[0];
        option.textContent = units[0];
        option.selected = true;
        unitSelect.appendChild(option);
        
        // Dispara o evento de mudança para aplicar o filtro
        setTimeout(() => unitSelect.dispatchEvent(new Event('change')), 0);
    } 
    // Se houver múltiplas unidades, mostra o seletor
    else if (units.length > 1) {
        // Adiciona a opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Unidade';
        unitSelect.appendChild(defaultOption);
        
        // Adiciona as unidades disponíveis
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.appendChild(option);
        });
        
        unitSelector.classList.add('has-multiple');
    }
}

// Função para carregar pessoas, unidades e setores ao iniciar a página
document.addEventListener('DOMContentLoaded', function() {
    fetchPeople().then(updateUnitSelector);
    // Atualiza as referências das funções antigas para a nova função
    window.renderPeopleList = () => renderPeople(people);
    window.renderFilteredPeopleList = (filteredPeople) => renderPeople(filteredPeople);
    
    // Adiciona event listeners ao campo de busca
    const filterNameInput = document.getElementById('filterName');
    const clearButton = document.getElementById('clearSearch');
    
    // Mostra/esconde o botão de limpar baseado no conteúdo do input
    function toggleClearButton() {
        clearButton.style.display = filterNameInput.value.trim() !== '' ? 'block' : 'none';
    }
    
    // Filtra enquanto digita
    filterNameInput.addEventListener('input', function() {
        toggleClearButton();
        applyFilters();
    });
    
    // Também filtra ao pressionar Enter (caso o usuário queira)
    filterNameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Previne o comportamento padrão do Enter
            applyFilters();
        }
    });
    
    // Limpa o campo de busca quando o botão X for clicado
    clearButton.addEventListener('click', function() {
        filterNameInput.value = '';
        filterNameInput.focus();
        toggleClearButton();
        applyFilters();
    });
    
    // Inicializa o estado do botão de limpar
    toggleClearButton();
    
    // Adiciona animação de rotação à seta do seletor de unidade
    const unitSelect = document.getElementById('filterUnit');
    const unitSelector = document.querySelector('.unit-selector');
    
    unitSelect.addEventListener('focus', () => {
        unitSelector.classList.add('open');
    });
    
    unitSelect.addEventListener('blur', () => {
        unitSelector.classList.remove('open');
    });
    
    // Adiciona classe open quando o dropdown é aberto (para navegadores que suportam o evento change)
    unitSelect.addEventListener('change', () => {
        unitSelector.classList.toggle('open');
    });
});
