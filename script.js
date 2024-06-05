document.addEventListener('DOMContentLoaded', function() {
    const addUnitSectorButton = document.getElementById('addUnitSectorButton');
    const addPersonButton = document.getElementById('addPersonButton');
    const savePersonButton = document.getElementById('savePersonButton');
    const saveUnitButton = document.getElementById('saveUnitButton');
    const saveSectorButton = document.getElementById('saveSectorButton');
    const unitCnpjInput = document.getElementById('unitCnpj');

    addUnitSectorButton.addEventListener('click', function() {
        openModal('manageUnitSectorModal');
    });

    addPersonButton.addEventListener('click', function() {
        openModal('addPersonModal');
        clearPersonModal();  // Clear the form fields
    });

    document.getElementById('closeManageUnitSectorModal').addEventListener('click', function() {
        closeModal('manageUnitSectorModal');
    });

    document.getElementById('closeAddPersonModal').addEventListener('click', function() {
        closeModal('addPersonModal');
    });

    document.getElementById('nameSearch').addEventListener('input', filterList);
    document.getElementById('sectorSearch').addEventListener('change', filterList);
    document.getElementById('unitSearch').addEventListener('change', filterList);

    savePersonButton.addEventListener('click', addOrUpdatePerson);
    saveUnitButton.addEventListener('click', addUnit);
    saveSectorButton.addEventListener('click', addSector);

    populateUnitSelect();
    populateSectorSelect();
    populateUnitList();
    populateUnitSectorList();
    filterList();

    unitCnpjInput.addEventListener('input', function() {
        const formattedCnpj = this.value.replace(/\D/g, '');
        const formattedValue = formattedCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
        this.value = formattedValue;
    });
});

function openModal(modalId) {
    if (modalId === 'manageUnitSectorModal') {
        populateUnitSelect();
        populateUnitList();
        populateUnitSectorList();
    } else if (modalId === 'addPersonModal') {
        populatePersonUnitSelect();
        populatePersonSectorSelect();
    }
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function clearPersonModal() {
    document.getElementById('editIndex').value = '';
    document.getElementById('personName').value = '';
    document.getElementById('personUnit').value = '';
    document.getElementById('personSector').value = '';
    document.getElementById('personExtension').value = '';
    document.getElementById('personEmail').value = '';
    document.getElementById('personCorporatePhone').value = '';
}

function addOrUpdatePerson() {
    const editIndex = document.getElementById('editIndex').value;
    const personName = document.getElementById('personName').value;
    const personUnit = document.getElementById('personUnit').value;
    const personSector = document.getElementById('personSector').value;
    const personExtension = document.getElementById('personExtension').value;
    const personEmail = document.getElementById('personEmail').value;
    const personCorporatePhone = document.getElementById('personCorporatePhone').value;

    if (!personName || !personUnit || !personSector || !personExtension) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const newPerson = {
        name: personName,
        unit: personUnit,
        sector: personSector,
        extension: personExtension,
        email: personEmail,
        corporatePhone: personCorporatePhone
    };

    let personList = JSON.parse(localStorage.getItem('personList')) || [];

    if (editIndex) {
        personList[editIndex] = newPerson;
        localStorage.setItem('personList', JSON.stringify(personList));
        closeModal('addPersonModal');
        populatePersonList();
        alert('Registro alterado com sucesso!');
    } else {
        personList.push(newPerson);
        localStorage.setItem('personList', JSON.stringify(personList));
        closeModal('addPersonModal');
        populatePersonList();
        alert('Registro adicionado com sucesso!');
    }
}

function populatePersonList() {
    const personList = JSON.parse(localStorage.getItem('personList')) || [];
    const adminExtensionList = document.getElementById('adminExtensionList');
    adminExtensionList.innerHTML = '';

    personList.forEach((person, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${person.name}</td>
            <td>${person.unit}</td>
            <td>${person.sector}</td>
            <td>${person.extension}</td>
            <td>${person.email || ''}</td>
            <td>${person.corporatePhone || ''}</td>
            <td class="actions">
                <button onclick="editPerson(${index})">Editar</button>
                <button onclick="deletePerson(${index})">Excluir</button>
            </td>
        `;

        adminExtensionList.appendChild(row);
    });
}

function editPerson(index) {
    const personList = JSON.parse(localStorage.getItem('personList')) || [];
    const person = personList[index];

    document.getElementById('editIndex').value = index;
    document.getElementById('personName').value = person.name;
    document.getElementById('personUnit').value = person.unit;
    document.getElementById('personSector').value = person.sector;
    document.getElementById('personExtension').value = person.extension;
    document.getElementById('personEmail').value = person.email;
    document.getElementById('personCorporatePhone').value = person.corporatePhone;

    openModal('addPersonModal');
    
    // Populate units and select the correct one
    populatePersonUnitSelect();
    document.getElementById('personUnit').value = person.unit;

    // Populate sectors and select the correct one
    populatePersonSectorSelect();
    document.getElementById('personSector').value = person.sector;
}

function deletePerson(index) {
    if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
        let personList = JSON.parse(localStorage.getItem('personList')) || [];
        personList.splice(index, 1);
        localStorage.setItem('personList', JSON.stringify(personList));
        populatePersonList();
    }
}

function filterList() {
    const nameFilter = document.getElementById('nameSearch').value.toLowerCase();
    const sectorFilter = document.getElementById('sectorSearch').value;
    const unitFilter = document.getElementById('unitSearch').value;

    const personList = JSON.parse(localStorage.getItem('personList')) || [];
    const filteredList = personList.filter(person => {
        return (!nameFilter || person.name.toLowerCase().includes(nameFilter)) &&
               (!sectorFilter || person.sector === sectorFilter) &&
               (!unitFilter || person.unit === unitFilter);
    });

    const adminExtensionList = document.getElementById('adminExtensionList');
    adminExtensionList.innerHTML = '';

    filteredList.forEach((person, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${person.name}</td>
            <td>${person.unit}</td>
            <td>${person.sector}</td>
            <td>${person.extension}</td>
            <td>${person.email || ''}</td>
            <td>${person.corporatePhone || ''}</td>
            <td class="actions">
                <button onclick="editPerson(${index})">Editar</button>
                <button onclick="deletePerson(${index})">Excluir</button>
            </td>
        `;

        adminExtensionList.appendChild(row);
    });
}

function addUnit() {
    const unitName = document.getElementById('unitName').value;
    const unitCnpj = document.getElementById('unitCnpj').value;

    if (!unitName || !unitCnpj) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const newUnit = {
        name: unitName,
        cnpj: unitCnpj
    };

    let unitList = JSON.parse(localStorage.getItem('unitList')) || [];
    unitList.push(newUnit);

    localStorage.setItem('unitList', JSON.stringify(unitList));
    populateUnitList();
    populatePersonUnitSelect();
    clearUnitForm();
}

function clearUnitForm() {
    document.getElementById('unitName').value = '';
    document.getElementById('unitCnpj').value = '';
}

function addSector() {
    const sectorName = document.getElementById('sectorName').value;
    const selectUnitForSector = document.getElementById('selectUnitForSector').value;

    if (!sectorName || !selectUnitForSector) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const newSector = {
        name: sectorName,
        unit: selectUnitForSector
    };

    let sectorList = JSON.parse(localStorage.getItem('sectorList')) || [];
    sectorList.push(newSector);

    localStorage.setItem('sectorList', JSON.stringify(sectorList));
    populateUnitSectorList();
    populatePersonSectorSelect();
    clearSectorForm();
}

function clearSectorForm() {
    document.getElementById('sectorName').value = '';
    document.getElementById('selectUnitForSector').value = '';
}

function populateUnitList() {
    const unitList = JSON.parse(localStorage.getItem('unitList')) || [];
    const unitTableBody = document.getElementById('unitList');
    unitTableBody.innerHTML = '';

    unitList.forEach((unit, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${unit.name}</td>
            <td>${unit.cnpj}</td>
            <td class="actions">
                <button onclick="deleteUnit(${index})">Excluir</button>
            </td>
        `;

        unitTableBody.appendChild(row);
    });
}

function deleteUnit(index) {
    if (confirm('Tem certeza que deseja excluir esta unidade?')) {
        let unitList = JSON.parse(localStorage.getItem('unitList')) || [];
        unitList.splice(index, 1);
        localStorage.setItem('unitList', JSON.stringify(unitList));
        populateUnitList();
        populatePersonUnitSelect();
    }
}

function populateUnitSectorList() {
    const sectorList = JSON.parse(localStorage.getItem('sectorList')) || [];
    const sectorTableBody = document.getElementById('sectorTableBody');
    sectorTableBody.innerHTML = '';

    sectorList.forEach((sector, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${sector.name}</td>
            <td>${sector.unit}</td>
            <td class="actions">
                <button onclick="deleteSector(${index})">Excluir</button>
            </td>
        `;

        sectorTableBody.appendChild(row);
    });
}

function deleteSector(index) {
    if (confirm('Tem certeza que deseja excluir este setor?')) {
        let sectorList = JSON.parse(localStorage.getItem('sectorList')) || [];
        sectorList.splice(index, 1);
        localStorage.setItem('sectorList', JSON.stringify(sectorList));
        populateUnitSectorList();
        populatePersonSectorSelect();
    }
}

function populateUnitSelect() {
    const unitList = JSON.parse(localStorage.getItem('unitList')) || [];
    const selectUnitForSector = document.getElementById('selectUnitForSector');
    const personUnit = document.getElementById('personUnit');

    selectUnitForSector.innerHTML = '<option value="">Selecione a Unidade</option>';
    personUnit.innerHTML = '<option value="">Selecione a Unidade</option>';

    unitList.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.name;
        option.textContent = unit.name;
        selectUnitForSector.appendChild(option);
        personUnit.appendChild(option);
    });
}

function populatePersonUnitSelect() {
    const unitList = JSON.parse(localStorage.getItem('unitList')) || [];
    const personUnit = document.getElementById('personUnit');

    personUnit.innerHTML = '<option value="">Selecione a Unidade</option>';

    unitList.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.name;
        option.textContent = unit.name;
        personUnit.appendChild(option);
    });
}

function populatePersonSectorSelect() {
    const sectorList = JSON.parse(localStorage.getItem('sectorList')) || [];
    const personSector = document.getElementById('personSector');

    personSector.innerHTML = '<option value="">Selecione o Setor</option>';

    sectorList.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        option.textContent = sector.name;
        personSector.appendChild(option);
    });
}

populatePersonList();
populateUnitList();
populateUnitSectorList();
populateUnitSelect();
populatePersonUnitSelect();
populatePersonSectorSelect();



