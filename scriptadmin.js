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
const auth = getAuth();
const db = getFirestore(app);

let people = [];
let units = [];
let sectors = [];

// Função para buscar pessoas do Firestore
async function fetchPeople() {
    const peopleCollection = collection(db, 'people');
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block'; 

    try {
        let loadingTimeout; 

        loadingTimeout = setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 3000); 

        onSnapshot(peopleCollection, (snapshot) => {
            people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('Pessoas carregadas:', people); 
            renderPeopleList(); 
            updateTotalPeopleCount(); // Atualiza a contagem de pessoas
            clearTimeout(loadingTimeout); 
            loadingElement.style.display = 'none';            
        });
    } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
        loadingElement.style.display = 'none'; 
    }
}

// Função para atualizar a contagem de pessoas cadastradas
function updateTotalPeopleCount() {
    const quantidadePessoas = document.getElementById('quantidadePessoas');
    quantidadePessoas.textContent = people.length; // Atualiza o número de pessoas cadastradas
}
// Função para buscar unidades do Firestore
async function fetchUnits() {
    const unitsCollection = collection(db, 'units');
    onSnapshot(unitsCollection, (snapshot) => {
        units = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateUnitSelect(); // Popula o seletor de unidades
        populateUnitList(); // Atualiza a lista de unidades
        filterList(); // Atualiza o filtro de unidades
    });
}
// Função para buscar setores do Firestore
async function fetchSectors() {
    const sectorsCollection = collection(db, 'sectors');
    onSnapshot(sectorsCollection, (snapshot) => {
        sectors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateSectorSelect();
        populateSectorList();
    });
}

// Função para renderizar a lista de pessoas
function renderPeopleList() {
    const adminExtensionList = document.getElementById('adminExtensionList');
    adminExtensionList.innerHTML = ''; // Limpa a lista antes de popular

    people.forEach((person) => {
        const row = document.createElement('tr');
    
        // Célula do nome com foto/iniciais
        const nameCell = document.createElement('td');
        nameCell.className = 'person-name-cell';
        const photoWrapper = document.createElement('span');
        photoWrapper.className = 'person-table-photo';
        if (person.photo) {
            const img = document.createElement('img');
            img.src = person.photo;
            img.alt = person.name;
            photoWrapper.appendChild(img);
        } else {
            const initials = (person.name || '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
            const initialsSpan = document.createElement('span');
            initialsSpan.className = 'person-table-initials';
            initialsSpan.textContent = initials;
            photoWrapper.appendChild(initialsSpan);
        }
        nameCell.appendChild(photoWrapper);
        const nameText = document.createElement('span');
        nameText.textContent = person.name;
        nameCell.appendChild(nameText);
    
        const unitCell = document.createElement('td');
        unitCell.textContent = person.unit;
    
        const sectorCell = document.createElement('td');
        sectorCell.textContent = person.sector;
    
        const extensionCell = document.createElement('td');
        extensionCell.textContent = person.extension;
    
        const actionsCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => editPerson(person.id); // Use o ID da pessoa em vez do índice
        actionsCell.appendChild(editButton);
    
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.onclick = () => deletePerson(person.id); // Passando o ID da pessoa
        actionsCell.appendChild(deleteButton);
    
        row.appendChild(nameCell);
        row.appendChild(unitCell);
        row.appendChild(sectorCell);
        row.appendChild(extensionCell);
        row.appendChild(actionsCell);
    
        adminExtensionList.appendChild(row);
    });
}

// Chamar funções de busca no carregamento
document.addEventListener('DOMContentLoaded', function() {
    fetchPeople(); // Carrega pessoas do Firestore
    fetchUnits();  // Carrega unidades do Firestore
    fetchSectors(); // Carrega setores do Firestore
});

// Funções para popular seletores de unidades e setores
function populateUnitSelect() {
    const unitSelect = document.getElementById('selectUnitForSector');
    const personUnitSelect = document.getElementById('personUnit');
    const unitFilterSelect = document.getElementById('filtro-unidade'); // Adicionando esta linha
    unitSelect.innerHTML = '<option value="">Selecione a Unidade</option>';
    personUnitSelect.innerHTML = '<option value="">Selecione a Unidade</option>';
    unitFilterSelect.innerHTML = '<option value="">Filtrar por Unidade Intermarítima</option>'; // Limpa o filtro

    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.name;
        option.textContent = unit.name;
        unitSelect.appendChild(option);
        personUnitSelect.appendChild(option.cloneNode(true));
        unitFilterSelect.appendChild(option.cloneNode(true)); // Adicionando ao filtro
    });
}

// Adicionando evento de clique ao botão de busca
document.getElementById('searchButton').addEventListener('click', filterList);
// Funções para fILTROS
function populateSectorSelect() {
    const sectorSearchSelect = document.getElementById('sectorSearch');
    const personSectorSelect = document.getElementById('personSector');
    sectorSearchSelect.innerHTML = '<option value="">Filtrar por setor</option>';
    personSectorSelect.innerHTML = '<option value="">Selecione o Setor</option>';

    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        option.textContent = sector.name;
        sectorSearchSelect.appendChild(option);
        personSectorSelect.appendChild(option.cloneNode(true));
    });
}
//LISTA PARA SETORES
function populateSectorList() {
    const sectorTableBody = document.getElementById('sectorTableBody');
    sectorTableBody.innerHTML = ''; // Limpa a lista antes de popular

    sectors.forEach((sector, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sector.name}</td>
            <td>${sector.unit}</td>
            <td class="actions">
                <button onclick="editSector(${index})">Editar</button>
                <button onclick="deleteSector(${index})">Excluir</button>
            </td>
        `;
        sectorTableBody.appendChild(row);
    });
}

// Função para popular a lista de pessoas
function populatePeopleList() {
    const adminExtensionList = document.getElementById('adminExtensionList');
    adminExtensionList.innerHTML = ''; // Limpa a lista antes de popular

    people.forEach((person) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const unitCell = document.createElement('td');
        const sectorCell = document.createElement('td');
        const extensionCell = document.createElement('td');
        const actionsCell = document.createElement('td');

        nameCell.textContent = person.name;
        unitCell.textContent = person.unit;
        sectorCell.textContent = person.sector;
        extensionCell.textContent = person.extension;

        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => editPerson(person.id); // Passando o ID da pessoa

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.onclick = () => deletePerson(person.id); // Passando o ID da pessoa

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);

        row.appendChild(nameCell);
        row.appendChild(unitCell);
        row.appendChild(sectorCell);
        row.appendChild(extensionCell);
        row.appendChild(actionsCell);

        adminExtensionList.appendChild(row);
    });
}
// script PARA OS BOTÕES ADICIONAR UNIDADE, ADICIONAR PESSOA
document.addEventListener('DOMContentLoaded', function() {
    const addUnitSectorButton = document.getElementById('addUnitSectorButton');
    const addPersonButton = document.getElementById('addPersonButton');
    const closeManageUnitSectorModal = document.getElementById('closeManageUnitSectorModal');
    const closeAddPersonModal = document.getElementById('closeAddPersonModal');

    // Função para abrir o modal
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block'; // Exibe o modal
        }
    }
    window.openModal = openModal;

    // Função para fechar o modal
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none'; // Oculta o modal
        }
    }

    // Adiciona evento de clique para o botão de Cadastrar Unidade/Setor
    addUnitSectorButton.addEventListener('click', function() {
        openModal('manageUnitSectorModal'); // Abre o modal de gerenciar unidades e setores
    });

    // Adiciona evento de clique para o botão de Adicionar Pessoa
    addPersonButton.addEventListener('click', function() {
        openModal('addPersonModal'); // Abre o modal de adicionar pessoa
    });

    // Adiciona evento de clique para fechar o modal de gerenciar unidades e setores
    closeManageUnitSectorModal.addEventListener('click', function() {
        closeModal('manageUnitSectorModal');
    });

    // Adiciona evento de clique para fechar o modal de adicionar pessoa
    closeAddPersonModal.addEventListener('click', function() {
        closeModal('addPersonModal');
    });

    // Fecha o modal quando o usuário clica fora do modal
    window.addEventListener('click', function(event) {
        const manageUnitSectorModal = document.getElementById('manageUnitSectorModal');
        const addPersonModal = document.getElementById('addPersonModal');

        if (event.target === manageUnitSectorModal) {
            closeModal('manageUnitSectorModal');
        }
        if (event.target === addPersonModal) {
            closeModal('addPersonModal');
        }
    });
});

//Evento de clique botão Salvar
document.getElementById('saveUnitButton').addEventListener('click', async function() {
    await addOrUpdateUnit(); // Chama a função para adicionar ou atualizar a unidade
});
// ADICIONAR, EDITAR OU EXCLUIR unidade
// ADICIONAR UNIDADE
async function addOrUpdateUnit() {
    const editUnitIndex = document.getElementById('editUnitIndex').value;
    const unitNameInput = document.getElementById('unitName');
    const unitCnpjInput = document.getElementById('unitCnpj');
    const unitName = unitNameInput.value;
    const unitCnpj = formatCnpj(unitCnpjInput.value); // Formata o CNPJ

    if (!unitName || !unitCnpj) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    const existingUnit = await checkCnpjExists(unitCnpj);
    if (existingUnit && !editUnitIndex) {
        alert('Uma unidade com esse CNPJ já existe.');
        return;
    }

    const unit = { name: unitName, cnpj: unitCnpj };

    try {
        if (editUnitIndex) {
            const unitDoc = doc(db, 'units', editUnitIndex);
            await updateDoc(unitDoc, unit);
            Swal.fire('Atualizado!', 'A unidade foi atualizada com sucesso.', 'success'); // Mensagem de confirmação
        } else {
            await addDoc(collection(db, 'units'), unit);
            Swal.fire('Adicionado!', 'A nova unidade foi adicionada com sucesso.', 'success'); // Mensagem de confirmação
        }

        populateUnitList(); // Atualiza a lista de unidades

        // Limpa os campos de entrada após a confirmação
        unitNameInput.value = '';
        unitCnpjInput.value = '';
        document.getElementById('editUnitIndex').value = ''; // Limpa o índice de edição, se aplicável

    } catch (error) {
        console.error('Erro ao adicionar ou atualizar unidade:', error);
        alert('Ocorreu um erro ao salvar a unidade.');
    }
}
// Função para formatar o CNPJ
function formatCnpj(cnpj) {
    // Remove caracteres que não são números
    cnpj = cnpj.replace(/\D/g, '');
    // Formata o CNPJ
    if (cnpj.length <= 14) {
        cnpj = cnpj.replace(/(\d{2})(\d)/, '$1.$2'); // 12.345
        cnpj = cnpj.replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); // 12.345.678
        cnpj = cnpj.replace(/(\d{3})(\d)/, '$1/$2'); // 12.345.678/90
        cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2'); // 12.345.678/90-12
    }
    return cnpj;
}
// Adicionando evento de input ao campo de CNPJ
document.getElementById('unitCnpj').addEventListener('input', function() {
    this.value = formatCnpj(this.value);
});
// Função para CHECAR SE O CNPJ EXISTE
async function checkCnpjExists(cnpj) {
    const unitsCollection = collection(db, 'units');
    const snapshot = await getDocs(unitsCollection);
    const existingUnit = snapshot.docs.find(doc => doc.data().cnpj === cnpj);
    return existingUnit !== undefined; // Retorna true se a unidade já existe
}
// Função para EDITAR unidade OK
window.editUnit = async function(index) {
    const unit = units[index]; // Obtém a unidade a ser editada
    console.log('Unidade selecionada para edição:', unit); // Log da unidade selecionada

    const swalResult = await Swal.fire({
        title: 'Editar Unidade',
        html: `
            <input type="text" id="unitNameInput" class="swal2-input" placeholder="Nome da Unidade" value="${unit.name}">
            <input type="text" id="unitCnpjInput" class="swal2-input" placeholder="CNPJ da Unidade" value="${formatCnpj(unit.cnpj)}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            // Captura os valores diretamente dos campos do SweetAlert no momento da confirmação
            const unitName = document.getElementById('unitNameInput').value.trim();
            const unitCnpj = formatCnpj(document.getElementById('unitCnpjInput').value.trim());

            // Validações
            if (!unitName) {
                Swal.showValidationMessage('Por favor, preencha o nome da unidade.');
                return false;
            }

            return { unitName, unitCnpj };
        }
    });

    // Se `swalResult.value` existir, significa que os dados foram confirmados
    if (swalResult.isConfirmed && swalResult.value) {
        const { unitName, unitCnpj } = swalResult.value;

        console.log('Dados da unidade a serem atualizados:', { name: unitName, cnpj: unitCnpj }); // Log dos dados a serem atualizados
        const unitDoc = doc(db, 'units', unit.id); // Obtém o documento da unidade a ser editada

        try {
            // Atualiza a unidade no Firestore com os dados capturados
            await updateDoc(unitDoc, { name: unitName, cnpj: unitCnpj });
            console.log('Unidade atualizada com sucesso:', { name: unitName, cnpj: unitCnpj }); // Log de sucesso
            await fetchUnits(); // Chama a função para buscar unidades novamente
            Swal.fire('Atualizado!', 'A unidade foi atualizada com sucesso.', 'success');
        } catch (error) {
            console.error('Erro ao atualizar a unidade:', error); // Log de erro
            Swal.fire('Erro!', 'Ocorreu um erro ao atualizar a unidade.', 'error');
        }
    } else {
        console.log("Nenhum dado foi confirmado para atualização.");
    }
}

// Função para excluir unidade OK
window.deleteUnit = async function(index) {
    const unitId = units[index].id; // Obtém o ID da unidade a ser excluída
    const unitName = units[index].name; // Obtém o nome da unidade

    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: `Você está prestes a excluir a unidade: ${unitName}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        await deleteDoc(doc(db, 'units', unitId)); // Deleta a unidade do Firestore
        Swal.fire('Excluído!', 'A unidade foi excluída com sucesso.', 'success'); // Mensagem de confirmação
        populateUnitList(); // Atualiza a lista de unidades
        // Não feche o modal aqui
    }
}

// Função para popular a lista de unidades OK
function populateUnitList() {
    const unitList = document.getElementById('unitList');
    unitList.innerHTML = ''; // Limpa a lista antes de popular
    
    units.forEach((unit, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${unit.name}</td>
            <td>${unit.cnpj}</td>
            <td class="actions">
                <button onclick="editUnit(${index})">Editar</button>
                <button onclick="deleteUnit(${index})">Excluir</button>
            </td>
        `;
        unitList.appendChild(row);
    });
}

// Função do botão Adicionar/Atualizar Setor
async function addOrUpdateSector() {
    const editSectorIndex = document.getElementById('editSectorIndex').value;
    const sectorName = document.getElementById('sectorName').value.trim();
    const unitName = document.getElementById('selectUnitForSector').value;

    // Validação dos campos
    if (!sectorName || !unitName) {
        Swal.fire('Erro!', 'Por favor, preencha todos os campos.', 'error');
        return;
    }

    const sector = { name: sectorName, unit: unitName };

    try {
        if (editSectorIndex) {
            const sectorDoc = doc(db, 'sectors', editSectorIndex);
            await updateDoc(sectorDoc, sector);
            Swal.fire('Atualizado!', 'Setor atualizado com sucesso!', 'success');
        } else {
            await addDoc(collection(db, 'sectors'), sector);
            Swal.fire('Adicionado!', 'Setor adicionado com sucesso!', 'success');
        }

        // Atualiza a lista de setores após a operação
        populateSectorList();
        populateSectorSelect();
    } catch (error) {
        console.error('Erro ao adicionar ou atualizar setor:', error);
        Swal.fire('Erro!', 'Ocorreu um erro ao salvar o setor.', 'error');
    } finally {
        clearSectorModal(); // Limpa o modal após a operação
    }
}
document.getElementById('saveSectorButton').addEventListener('click', async function() {
    await addOrUpdateSector(); // Chama a função para adicionar ou atualizar o setor
});

// Função para editar setor
window.editSector = async function(index) {
    const sector = sectors[index]; // Obtém o setor a ser editado

    // Cria um seletor de unidades
    const unitOptions = units.map(unit => `<option value="${unit.name}">${unit.name}</option>`).join('');

    const swalResult = await Swal.fire({
        title: 'Editar Setor',
        html: `
            <input type="text" id="sectorNameInput" class="swal2-input" placeholder="Nome do Setor" value="${sector.name}">
            <select id="selectUnitInput" class="swal2-input">
                <option value="">Sele cione a Unidade</option>
                ${unitOptions}
            </select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const sectorName = document.getElementById('sectorNameInput').value.trim();
            const unitName = document.getElementById('selectUnitInput').value;

            // Validações
            if (!sectorName || !unitName) {
                Swal.showValidationMessage('Por favor, preencha todos os campos.');
                return false;
            }

            return { sectorName, unitName };
        }
    });

    if (swalResult.isConfirmed && swalResult.value) {
        const { sectorName, unitName } = swalResult.value;

        // Atualiza o setor no Firestore
        const sectorDoc = doc(db, 'sectors', sector.id);
        await updateDoc(sectorDoc, { name: sectorName, unit: unitName });
        Swal.fire('Atualizado!', 'Setor atualizado com sucesso!', 'success');
        await fetchSectors(); // Atualiza a lista de setores
    }
};

// Função para deletar setor
async function deleteSector(index) {
    const sectorId = sectors[index].id;
    const sectorName = sectors[index].name; // Obtém o nome do setor para confirmação

    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: `Você está prestes a excluir o setor: ${sectorName}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'sectors', sectorId));
            Swal.fire('Excluído!', 'Setor excluído com sucesso!', 'success');
            await fetchSectors(); // Atualiza a lista de setores
        } catch (error) {
            console.error('Erro ao excluir setor:', error);
            Swal.fire('Erro!', 'Ocorreu um erro ao excluir o setor.', 'error');
        }
    }
}

// Certifique-se de que a função está no escopo global
window.deleteSector = deleteSector; // Isso garante que a função esteja acessível globalmente


// Função para limpar o modal de setor
function clearSectorModal() {
    document.getElementById('editSectorIndex').value = '';
    document.getElementById('sectorName').value = '';
    document.getElementById('selectUnitForSector').value = '';
}

document.getElementById('addPersonButton').addEventListener('click', function() {
    console.log('Botão Adicionar Pessoa clicado'); // Adicione esta linha
    openModal('addPersonModal'); // Abre o modal de adicionar pessoa
    clearPersonModal(); // Limpa os campos do modal
});

// Função para limpar o modal de pessoa
function clearPersonModal() {
    document.getElementById('editIndex').value = '';
    document.getElementById('personName').value = '';
    document.getElementById('personUnit').value = '';
    document.getElementById('personSector').value = '';
    document.getElementById('personExtension').value = '';
}
//Adicionar PESSOA
async function addOrUpdatePerson() {
    const editIndex = document.getElementById('editIndex').value;
    const personName = document.getElementById('personName').value.trim();
    const personUnit = document.getElementById('personUnit').value;
    const personSector = document.getElementById('personSector').value;
    const personExtension = document.getElementById('personExtension').value;

    // Validação dos campos
    if (!personName || !personUnit || !personSector || !personExtension) {
        Swal.fire('Erro!', 'Por favor, preencha todos os campos.', 'error');
        return;
    }

    const person = {
        name: personName,
        unit: personUnit,
        sector: personSector,
        extension: personExtension,
    };

    try {
        if (editIndex) {
            const personDoc = doc(db, 'people', editIndex);
            await updateDoc(personDoc, person);
            Swal.fire('Atualizado!', 'Pessoa atualizada com sucesso!', 'success');
        } else {
            await addDoc(collection(db, 'people'), person);
            Swal.fire('Adicionado!', 'Pessoa adicionada com sucesso!', 'success');
        }

        // Atualiza a lista de pessoas após a operação
        await fetchPeople(); // Chama a função para buscar pessoas novamente
        clearPersonModal(); // Limpa os campos do modal

    } catch (error) {
        console.error('Erro ao adicionar ou atualizar pessoa:', error);
        Swal.fire('Erro!', 'Ocorreu um erro ao salvar a pessoa.', 'error');
    }
}

// Função para editar pessoa
window.editPerson = async function(personId) {
    const person = people.find(p => p.id === personId); // Busca a pessoa pelo ID

    if (!person) {
        console.error('Pessoa não encontrada para edição:', index);
        return; // Sai da função se a pessoa não for encontrada
    }

    const swalResult = await Swal.fire({
        title: 'Editar Pessoa',
        html: `
        <style>
        .swal2-input, .swal2-select {
            width: 100% !important;
            max-width: 350px !important;
            padding: 10px !important;
            border-radius: 25px !important;
            border: 1px solid #ddd !important;
            font-size: 16px !important;
            margin-top: 4px !important;
            margin-bottom: 16px !important;
            background: #fff !important;
            box-sizing: border-box !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        .swal2-actions button.swal2-confirm {
            background-color: #006c5b !important;
            color: #fff !important;
            border-radius: 25px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            padding: 10px 24px !important;
            margin-right: 8px !important;
        }
        .swal2-actions button.swal2-cancel {
            background-color: #ccc !important;
            color: #fff !important;
            border-radius: 25px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            padding: 10px 24px !important;
        }
        .swal2-actions button.swal2-confirm:hover {
            background-color: #4CAF50 !important;
        }
        .swal2-actions button.swal2-cancel:hover {
            background-color: #888 !important;
        }
        </style>
        <div style="display: flex; flex-direction: column; gap: 0;">
            <label style="text-align:left; margin-bottom:2px;">Nome:</label>
            <input type="text" id="personNameInput" class="swal2-input" placeholder="Nome" value="${person.name}">
            <label style="text-align:left; margin-bottom:2px;">Unidade:</label>
            <select id="personUnitInput" class="swal2-select">
                <option value="">Selecione a Unidade</option>
                ${units.map(unit => `<option value="${unit.name}" ${unit.name === person.unit ? 'selected' : ''}>${unit.name}</option>`).join('')}
            </select><p>
            Setor:<select id="personSectorInput" class="swal2-input">
                <option value="">Selecione o Setor</option>
                ${sectors.map(sector => `<option value="${sector.name}" ${sector.name === person.sector ? 'selected' : ''}>${sector.name}</option>`).join('')}
            </select><p>
            Ramal:<input type="text" id="personExtensionInput" class="swal2-input" placeholder="Ramal" value="${person.extension}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const name = document.getElementById('personNameInput').value.trim();
            const unit = document.getElementById('personUnitInput').value;
            const sector = document.getElementById('personSectorInput').value;
            const extension = document.getElementById('personExtensionInput').value;
            // Validações
            if (!name || !unit || !sector || !extension) {
                Swal.showValidationMessage('Por favor, preencha todos os campos.');
                return false;
            }

            return { name, unit, sector, extension }; // Removendo email e corporatePhone
        }
    });

    if (swalResult.isConfirmed && swalResult.value) {
        const { name, unit, sector, extension } = swalResult.value;

        const personDoc = doc(db, 'people', person.id);
        await updateDoc(personDoc, {
            name,
            unit,
            sector,
            extension
        });
        Swal.fire('Atualizado!', 'Pessoa atualizada com sucesso!', 'success');
        await fetchPeople(); // Atualiza a lista de pessoas
    }
};

document.getElementById('savePersonButton').addEventListener('click', async function() {
    await addOrUpdatePerson(); // Chama a função para adicionar ou atualizar a pessoa
});

// Função para excluir pessoa
window.deletePerson = async function(personId) {
    const person = people.find(p => p.id === personId); // Encontra a pessoa pelo ID
    if (person) {
        // Monta a mensagem com as informações completas da pessoa
        const message = `
            <strong>Você está prestes a excluir a seguinte pessoa:</strong><br>
            <strong>Nome:</strong> ${person.name}<br>
            <strong>Unidade:</strong> ${person.unit}<br>
            <strong>Setor:</strong> ${person.sector}<br>
            <strong>Ramal:</strong> ${person.extension}<br>
        `;

        const result = await Swal.fire({
            title: 'Tem certeza?',
            html: message, // Usando HTML para exibir as informações
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            await deleteDoc(doc(db, 'people', personId));
            Swal.fire('Excluído!', 'A pessoa foi excluída com sucesso.', 'success');
            await fetchPeople(); // Atualiza a lista de pessoas
        }
    } else {
        console.error('Pessoa não encontrada para exclusão:', personId);
    }
};

// Função para filtrar a lista de pessoas
function filterList() {
    const nameSearch = document.getElementById('nameSearch').value.toLowerCase();
    const sectorSearch = document.getElementById('sectorSearch').value;
    const unitSearch = document.getElementById('filtro-unidade').value; // Certifique-se que o ID está correto
    const filteredPeople = people.filter(person => {
        return (
            (person.name.toLowerCase().includes(nameSearch)) &&
            (sectorSearch === '' || person.sector === sectorSearch) &&
            (unitSearch === '' || person.unit === unitSearch)
        );
    });

    renderFilteredPeopleList(filteredPeople);

    // Mostra ou esconde o botão X conforme o input
    const clearBtn = document.getElementById('clearSearchBtn');
    if (document.getElementById('nameSearch').value.length > 0 || sectorSearch || unitSearch) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
}

// Evento para limpar busca e filtros
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('nameSearch');
    const sectorSelect = document.getElementById('sectorSearch');
    const unitSelect = document.getElementById('filtro-unidade');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            nameInput.value = '';
            sectorSelect.value = '';
            unitSelect.value = '';
            filterList();
        });
        // Mostra/esconde o botão X ao digitar
        nameInput.addEventListener('input', filterList);
        sectorSelect.addEventListener('change', filterList);
        unitSelect.addEventListener('change', filterList);
    }
});

// Função para renderizar a lista filtrada de pessoas
function renderFilteredPeopleList(filteredPeople) {
    const adminExtensionList = document.getElementById('adminExtensionList');
    adminExtensionList.innerHTML = '';

    filteredPeople.forEach((person, index) => {
        const row = document.createElement('tr');
        // Monta célula do nome com foto/iniciais igual ao renderPeopleList
        let nameCellHtml = `<td class="person-name-cell">`;
        nameCellHtml += `<span class="person-table-photo">`;
        if (person.photo) {
            nameCellHtml += `<img src="${person.photo}" alt="${person.name}" />`;
        } else {
            const initials = (person.name || '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
            nameCellHtml += `<span class="person-table-initials">${initials}</span>`;
        }
        nameCellHtml += `</span>`;
        nameCellHtml += `<span>${person.name}</span></td>`;

        row.innerHTML = `
            ${nameCellHtml}
            <td>${person.unit}</td>
            <td>${person.sector}</td>
            <td>${person.extension}</td>
            <td class="actions">
                <button onclick="editPerson('${person.id}')">Editar</button>
                <button onclick="deletePerson('${person.id}')">Excluir</button>
            </td>
        `;
        adminExtensionList.appendChild(row);
    });
}

// Suponha que você tenha um array de pessoas
let pessoas = []; // Array que contém as pessoas cadastradas

function atualizarQuantidadePessoas() {
    const quantidadePessoas = document.getElementById('quantidadePessoas');
    quantidadePessoas.textContent = pessoas.length; // Atualiza o número de pessoas cadastradas
}

// Função para adicionar uma nova pessoa
function adicionarPessoa(novaPessoa) {
    pessoas.push(novaPessoa);
    atualizarQuantidadePessoas(); // Atualiza a quantidade após adicionar
}

// Função para remover uma pessoa
function removerPessoa(index) {
    if (index > -1 && index < pessoas.length) {
        pessoas.splice(index, 1);
        atualizarQuantidadePessoas(); // Atualiza a quantidade após remover
    }
}

// Chame essa função inicialmente para definir a quantidade
atualizarQuantidadePessoas();
