// Configuração do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
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
    onSnapshot(peopleCollection, (snapshot) => {
        people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPeopleList(); // Chama a função que renderiza a lista de pessoas
        fetchUnitsAndSectors(); // Chama a função para carregar as unidades e setores nos filtros
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
    unitSelect.innerHTML = '<option value="">Unidade</option>'; // Limpa as opções antes de preencher
    uniqueUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit;
        unitSelect.appendChild(option);
    });

    // Preenche opções de setores
    sectorSelect.innerHTML = '<option value="">Setor</option>'; // Limpa as opções antes de preencher
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorSelect.appendChild(option);
    });
}

// Função para renderizar a lista de pessoas por setor
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

        // Criação da tabela para o setor
        const table = document.createElement('table');
        table.className = 'peopleTable'; // Adiciona uma classe para estilização

        // Cabeçalho da tabela
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Ramal</th>
            </tr>
        `;
        table.appendChild(thead);

        // Corpo da tabela
        const tbody = document.createElement('tbody');

        // Lista de pessoas no setor
        sectors[sector].forEach(person => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${person.name}</td>
                <td>${person.unit}</td>
                <td>${person.extension}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        sectorDiv.appendChild(table); // Adiciona a tabela ao setor
        ramaisContainer.appendChild(sectorDiv); // Adiciona o setor ao contêiner principal
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

        // Criação da tabela para o setor
        const table = document.createElement('table');
        table.className = 'peopleTable'; // Adiciona uma classe para estilização

        // Cabeçalho da tabela
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Ramal</th>
            </tr>
        `;
        table.appendChild(thead);

        // Corpo da tabela
        const tbody = document.createElement('tbody');

        // Lista de pessoas no setor filtrado
        sectors[sector].forEach(person => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${person.name}</td>
                <td class="centered">${person.unit}</td>
                <td class="centered">${person.extension}</td>
            `;

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        sectorDiv.appendChild(table); // Adiciona a tabela ao setor
        ramaisContainer.appendChild(sectorDiv); // Adiciona o setor ao contêiner principal
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