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
    const peopleCollection = collection(db, 'people');
    const loadingMessage = document.getElementById('loadingMessage');
    
    onSnapshot(peopleCollection, (snapshot) => {
        people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPeopleList(); // Chama a função que renderiza a lista de pessoas
        fetchUnitsAndSectors(); // Chama a função para carregar as unidades e setores nos filtros
        
        // Esconde a mensagem de carregamento após carregar os dados
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    });
}

// Função para preencher as opções de unidade e setor nos filtros
function fetchUnitsAndSectors() {
    const unitSelect = document.getElementById('filterUnit');
    const sectorSelect = document.getElementById('filterSector');

    // Obtém unidades e setores únicos
    const uniqueUnits = [...new Set(people.map(person => person.unit))];
    const uniqueSectors = [...new Set(people.map(person => person.sector))];

    // Preenche opções de unidades
    unitSelect.innerHTML = '<option value="">Selecione Unidade</option>'; // Limpa as opções antes de preencher
    uniqueUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        unitSelect.appendChild(option);
    });

    // Preenche opções de setores
    sectorSelect.innerHTML = '<option value="">Selecione Setor</option>'; // Limpa as opções antes de preencher
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorSelect.appendChild(option);
    });
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
function renderPeopleList() {
    const ramaisContainer = document.getElementById('ramaisContainer');
    ramaisContainer.innerHTML = ''; // Limpa a lista antes de popular

    // Agrupa pessoas por setor
    const sectors = people.reduce((acc, person) => {
        acc[person.sector] = acc[person.sector] || [];
        acc[person.sector].push(person);
        return acc;
    }, {});

    // Cria blocos de setor
    Object.keys(sectors).forEach(sector => {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'ramais-container';
        
        // Nome do setor
        const sectorTitle = document.createElement('h2');
        sectorTitle.textContent = sector;
        sectorDiv.appendChild(sectorTitle);

        // Container para os cards
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'people-cards';

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
            
            // Mapear status para emojis e nomes (igual à tela de edição)
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
            
            // Setor em verde escuro centralizado
            const sectorElement = document.createElement('div');
            sectorElement.className = 'person-sector';
            sectorElement.textContent = person.sector || 'Setor não informado';
            
            // Unidade
            const unitElement = document.createElement('div');
            unitElement.className = 'person-unit';
            unitElement.textContent = person.unit;
            
            // Ramal
            const extensionElement = document.createElement('div');
            extensionElement.className = 'extension';
            extensionElement.textContent = person.extension;
            
            // Adiciona todos os elementos ao card
            card.appendChild(profilePic);
            card.appendChild(nameElement);
            card.appendChild(sectorElement);
            card.appendChild(unitElement);
            card.appendChild(extensionElement);
            
            cardsContainer.appendChild(card);
        });
        
        sectorDiv.appendChild(cardsContainer);
        ramaisContainer.appendChild(sectorDiv);
    });
}

// Função para aplicar filtros
window.applyFilters = function() {
    const nameFilter = document.getElementById('filterName').value.toLowerCase();
    const unitFilter = document.getElementById('filterUnit').value;
    const sectorFilter = document.getElementById('filterSector').value;

    const filteredPeople = people.filter(person => {
        const matchesName = person.name.toLowerCase().includes(nameFilter);
        const matchesUnit = !unitFilter || person.unit === unitFilter;
        const matchesSector = !sectorFilter || person.sector === sectorFilter;

        return matchesName && matchesUnit && matchesSector;
    });

    renderFilteredPeopleList(filteredPeople);
};

// Função para renderizar a lista filtrada de pessoas
function renderFilteredPeopleList(filteredPeople) {
    const ramaisContainer = document.getElementById('ramaisContainer');
    ramaisContainer.innerHTML = ''; // Limpa a lista antes de popular

    // Se não houver resultados, mostra uma mensagem
    if (filteredPeople.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'Nenhum resultado encontrado';
        ramaisContainer.appendChild(noResults);
        return;
    }

    // Agrupa pessoas filtradas por setor
    const sectors = filteredPeople.reduce((acc, person) => {
        acc[person.sector] = acc[person.sector] || [];
        acc[person.sector].push(person);
        return acc;
    }, {});

    // Cria blocos de setor
    Object.keys(sectors).forEach(sector => {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'ramais-container';

        // Nome do setor
        const sectorTitle = document.createElement('h2');
        sectorTitle.textContent = sector;
        sectorDiv.appendChild(sectorTitle);

        // Container para os cards
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'people-cards';

        // Cria cards para cada pessoa no setor filtrado
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
            
            // Mapear status para emojis e nomes (igual à tela de edição)
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
            
            // Setor em verde escuro centralizado
            const sectorElement = document.createElement('div');
            sectorElement.className = 'person-sector';
            sectorElement.textContent = person.sector || 'Setor não informado';
            
            // Unidade
            const unitElement = document.createElement('div');
            unitElement.className = 'person-unit';
            unitElement.textContent = person.unit;
            
            // Ramal
            const extensionElement = document.createElement('div');
            extensionElement.className = 'extension';
            extensionElement.textContent = person.extension;
            
            // Adiciona todos os elementos ao card
            card.appendChild(profilePic);
            card.appendChild(nameElement);
            card.appendChild(sectorElement);
            card.appendChild(unitElement);
            card.appendChild(extensionElement);
            
            cardsContainer.appendChild(card);
        });
        
        sectorDiv.appendChild(cardsContainer);
        ramaisContainer.appendChild(sectorDiv);
    });
}

// Função para carregar pessoas, unidades e setores ao iniciar a página
document.addEventListener('DOMContentLoaded', function() {
    fetchPeople();
});

// Adiciona um event listener ao campo de busca
document.getElementById('filterName').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Previne o comportamento padrão do Enter
        applyFilters(); // Chama a função de aplicar filtros
    }
});