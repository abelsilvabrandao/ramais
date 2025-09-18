// --- SOCKET.IO CLIENT PARA STATUS EM TEMPO REAL ---
import io from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
const socket = io('http://localhost:3001');
// --------------------------------------------------

// Configuração do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc,
    getDoc,
    setDoc,
    limit
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

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
console.log('Inicializando Firebase...');
let app, db, storage;

try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase App inicializado com sucesso!');
    
    db = getFirestore(app);
    console.log('Firestore inicializado com sucesso!');
    
    storage = getStorage(app);
    console.log('Storage inicializado com sucesso!');
    
    // Teste de conexão com o Firestore
    const testQuery = query(collection(db, 'people'), limit(1));
    getDocs(testQuery)
        .then(() => console.log('Conexão com o Firestore está funcionando!'))
        .catch(error => console.error('Erro ao conectar ao Firestore:', error));
        
} catch (error) {
    console.error('Erro ao inicializar o Firebase:', {
        code: error.code,
        message: error.message,
        stack: error.stack
    });
    
    // Tenta obter a configuração do app padrão se a inicialização explícita falhar
    try {
        app = getApp();
        db = getFirestore(app);
        storage = getStorage(app);
        console.warn('Usando instância padrão do Firebase após falha na inicialização explícita');
    } catch (defaultError) {
        console.error('Falha ao obter instância padrão do Firebase:', defaultError);
        throw new Error('Não foi possível inicializar o Firebase: ' + error.message);
    }
}

// Elementos da UI
const searchRamal = document.getElementById('searchRamal');
const searchResults = document.getElementById('searchResults');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userRamal = document.getElementById('userRamal');
const userSector = document.getElementById('userSector');
const profilePreview = document.getElementById('profilePreview');
const userInitials = document.getElementById('userInitials');
const photoInput = document.getElementById('photoInput');
const saveBtn = document.getElementById('saveBtn');
const statusOptions = document.querySelectorAll('.status-option');
const userStatusInput = document.getElementById('userStatus');
const removePhotoBtn = document.getElementById('removePhotoBtn');
let hasPhoto = false; // Controla se o usuário tem foto

// Log dos elementos carregados
console.log('Elementos da UI carregados:', {
    searchRamal: !!searchRamal,
    searchResults: !!searchResults,
    userInfo: !!userInfo,
    userName: !!userName,
    userRamal: !!userRamal,
    userSector: !!userSector,
    profilePreview: !!profilePreview,
    userInitials: !!userInitials,
    photoInput: !!photoInput,
    saveBtn: !!saveBtn,
    statusOptions: statusOptions.length,
    userStatusInput: !!userStatusInput
});

let selectedUser = null;
let currentFile = null;

// Função para obter as iniciais do nome
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Função para buscar pessoas pelo nome ou ramal
async function searchPeople(searchTerm) {
    if (searchTerm.length < 2) {
        searchResults.innerHTML = '';
        return [];
    }

    const peopleRef = collection(db, 'people');
    
    // Verifica se a busca é por número de ramal (apenas números)
    const isRamalSearch = /^\d+$/.test(searchTerm);
    
    let q;
    if (isRamalSearch) {
        // Busca pelo número do ramal (exato ou que começa com o número)
        q = query(
            peopleRef,
            where('extension', '>=', searchTerm),
            where('extension', '<=', searchTerm + '\uf8ff')
        );
    } else {
        // Busca por nome (case insensitive)
        const searchTermLower = searchTerm.toLowerCase();
        q = query(peopleRef);
    }

    const querySnapshot = await getDocs(q);
    
    // Filtra os resultados localmente para permitir busca case insensitive e mais flexível
    const results = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const person = {
            id: doc.id,
            ...data
        };
        
        if (isRamalSearch) {
            // Se for busca por ramal, já está pré-filtrado
            results.push(person);
        } else {
            // Filtra por nome ou setor (case insensitive)
            const searchTermLower = searchTerm.toLowerCase();
            if (person.name && person.name.toLowerCase().includes(searchTermLower) ||
                (person.unit && person.unit.toLowerCase().includes(searchTermLower)) ||
                (person.extension && person.extension.toString().includes(searchTerm))) {
                results.push(person);
            }
        }
    });
    
    // Ordena os resultados por nome
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    return results;
}

// Função para exibir resultados da busca
function displaySearchResults(results) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'Nenhum resultado encontrado';
        noResults.className = 'no-results';
        searchResults.appendChild(noResults);
        return;
    }
    
    // Agrupar por unidade e setor
    const resultsByUnitSector = {};
    results.forEach(person => {
        const unit = person.unit || 'Outros';
        const sector = person.sector || 'Geral';
        const key = `${unit}|||${sector}`;
        
        if (!resultsByUnitSector[unit]) {
            resultsByUnitSector[unit] = {};
        }
        if (!resultsByUnitSector[unit][sector]) {
            resultsByUnitSector[unit][sector] = [];
        }
        resultsByUnitSector[unit][sector].push(person);
    });
    
    // Criar seções por unidade e setor
    Object.entries(resultsByUnitSector).forEach(([unit, sectors]) => {
        // Cabeçalho da unidade
        const unitHeader = document.createElement('div');
        unitHeader.className = 'unit-header';
        unitHeader.textContent = unit;
        searchResults.appendChild(unitHeader);
        
        // Para cada setor dentro da unidade
        Object.entries(sectors).forEach(([sector, people]) => {
            // Cabeçalho do setor
            const sectorHeader = document.createElement('div');
            sectorHeader.className = 'sector-header';
            sectorHeader.textContent = sector;
            searchResults.appendChild(sectorHeader);
        
        people.forEach(person => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            // Criar elemento para a foto/iniciais
            const photoContainer = document.createElement('div');
            photoContainer.className = 'result-photo';
            
            if (person.photoBase64 || person.photoUrl) {
                const img = document.createElement('img');
                img.src = person.photoBase64 || person.photoUrl;
                img.alt = person.name;
                photoContainer.appendChild(img);
            } else {
                const initials = getInitials(person.name);
                const initialsDiv = document.createElement('div');
                initialsDiv.className = 'result-initials';
                initialsDiv.textContent = initials;
                photoContainer.appendChild(initialsDiv);
            }
            
            // Criar elemento para as informações
            const infoContainer = document.createElement('div');
            infoContainer.className = 'result-info';
            
            const nameElement = document.createElement('div');
            nameElement.className = 'result-name';
            nameElement.textContent = person.name;
            
            const detailsElement = document.createElement('div');
            detailsElement.className = 'result-details';
            const sector = person.sector || person.unit;
            detailsElement.innerHTML = `
                <div class="ramal">
                    <span class="label">Ramal:</span>
                    <span class="value">${person.extension || 'N/A'}</span>
                </div>
                ${person.sector ? `
                    <div class="sector">
                        <span class="label">Setor:</span>
                        <span class="value">${person.sector}</span>
                    </div>
                ` : ''}
            `;
            
            infoContainer.appendChild(nameElement);
            infoContainer.appendChild(detailsElement);
            
            // Adicionar elementos ao item de resultado
            resultItem.appendChild(photoContainer);
            resultItem.appendChild(infoContainer);
            
            // Adicionar evento de clique
            resultItem.addEventListener('click', () => {
                selectPerson(person);
                searchResults.innerHTML = '';
                searchRamal.value = person.name;
            });
            
            searchResults.appendChild(resultItem);
            });
        });
    });
}

// Função para remover a foto e mostrar as iniciais
function removePhoto() {
    if (!selectedUser) return;
    
    // Mostrar confirmação
    Swal.fire({
        title: 'Remover foto?',
        text: 'Deseja remover a foto de perfil e voltar a exibir as iniciais?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, remover foto',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Limpar o preview
            profilePreview.innerHTML = '';
            userInitials.textContent = getInitials(selectedUser.name);
            profilePreview.appendChild(userInitials);
            
            // Limpar o input de arquivo
            photoInput.value = '';
            
            // Atualizar estado
            hasPhoto = false;
            removePhotoBtn.style.display = 'none';
            
            // Habilitar botão de salvar para aplicar as alterações
            saveBtn.disabled = false;
            
            // Marcar que a foto deve ser removida
            selectedUser.shouldRemovePhoto = true;
            
            console.log('Foto removida, mostrando iniciais');
            
            // Mostrar feedback visual
            const preview = document.querySelector('.profile-preview');
            preview.style.animation = 'pulse 0.5s';
            setTimeout(() => {
                preview.style.animation = '';
            }, 500);
        }
    });
}

// Adicionar animação de pulse
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Função para selecionar uma pessoa
function selectPerson(person) {
    console.log('Selecionando pessoa:', {
        id: person.id,
        name: person.name,
        status: person.status || 'não definido',
        hasPhoto: !!(person.photoBase64 || person.photoUrl)
    });
    
    selectedUser = person;
    selectedUser.shouldRemovePhoto = false; // Resetar flag de remoção
    
    // Atualizar informações do usuário
    userName.textContent = person.name;
    userRamal.textContent = person.extension;
    userSector.textContent = `${person.sector} - ${person.unit}`;
    
    // Exibir foto ou iniciais
    if (person.photoBase64) {
        console.log('Exibindo foto em base64');
        profilePreview.innerHTML = `<img src="${person.photoBase64}" alt="${person.name}" class="profile-img">`;
        hasPhoto = true;
        removePhotoBtn.style.display = 'block';
    } else if (person.photoUrl) {
        console.log('Exibindo foto por URL');
        profilePreview.innerHTML = `<img src="${person.photoUrl}" alt="${person.name}" class="profile-img">`;
        hasPhoto = true;
        removePhotoBtn.style.display = 'block';
    } else {
        console.log('Exibindo iniciais');
        userInitials.textContent = getInitials(person.name);
        profilePreview.innerHTML = '';
        profilePreview.appendChild(userInitials);
        hasPhoto = false;
        removePhotoBtn.style.display = 'none';
    }
    
    // Definir status atual
    const currentStatus = person.status || 'available';
    console.log('Definindo status atual:', currentStatus);
    
    // Atualizar o valor do input hidden
    if (userStatusInput) {
        userStatusInput.value = currentStatus;
        console.log('Input de status atualizado para:', userStatusInput.value);
    } else {
        console.error('Input de status não encontrado!');
    }
    
    // Atualizar botão de status ativo
    let foundActive = false;
    statusOptions.forEach(option => {
        if (option.dataset.status === currentStatus) {
            option.classList.add('active');
            foundActive = true;
            console.log('Botão de status ativado:', option.dataset.status);
        } else {
            option.classList.remove('active');
        }
    });
    
    if (!foundActive && statusOptions.length > 0) {
        console.warn('Nenhum botão de status corresponde ao status atual:', currentStatus);
    }
    
    // Exibir seção de informações
    userInfo.style.display = 'block';
    saveBtn.disabled = false;
    
    console.log('Pessoa selecionada com sucesso. Status:', currentStatus);
}

// Função para converter arquivo em base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Função para processar e redimensionar a imagem
async function processImage(file) {
    return new Promise((resolve) => {
        // Verificar se o arquivo é uma imagem
        if (!file.type.match('image.*')) {
            throw new Error('Por favor, selecione uma imagem válida.');
        }
        
        // Verificar o tamanho do arquivo (máx 2MB)
        if (file.size > 2 * 1024 * 1024) {
            // Se for maior que 2MB, redimensiona
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                // Tamanho máximo desejado
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                // Redimensionar mantendo a proporção
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                // Desenhar a imagem redimensionada
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter para base64 com qualidade reduzida
                const base64String = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64String);
            };
            
            img.src = URL.createObjectURL(file);
        } else {
            // Se for menor que 2MB, converte direto
            fileToBase64(file).then(resolve);
        }
    });
}

// Event Listeners

// Evento para remover a foto
removePhotoBtn.addEventListener('click', removePhoto);

// Evento para quando uma nova foto é selecionada
photoInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        // Se uma nova foto for selecionada, esconde o botão de remover
        // pois agora temos uma nova foto para ser salva
        removePhotoBtn.style.display = 'none';
        
        // Se havia uma marcação para remover a foto, remove-a
        if (selectedUser) {
            selectedUser.shouldRemovePhoto = false;
        }
        
        // Mostra o botão de remover novamente após a seleção
        removePhotoBtn.style.display = 'block';
        
        // Habilita o botão de salvar
        saveBtn.disabled = false;
    }
});

// Evento de busca com debounce
const handleSearch = debounce(async (e) => {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length < 2) {
        searchResults.classList.remove('visible');
        searchResults.innerHTML = '';
        return;
    }
    
    // Mostra o indicador de carregamento
    searchResults.innerHTML = `
        <div class="loading-results">
            <div class="loading-spinner"></div>
            <span>Buscando...</span>
        </div>
    `;
    searchResults.classList.add('visible');
    
    try {
        const results = await searchPeople(searchTerm);
        if (searchRamal.value.trim() === searchTerm) { // Apenas atualiza se o termo de busca ainda for o mesmo
            displaySearchResults(results);
            searchResults.classList.add('visible');
        }
    } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
        if (searchRamal.value.trim() === searchTerm) { // Apenas mostra erro se o termo de busca ainda for o mesmo
            searchResults.innerHTML = `
                <div class="no-results">
                    <div class="error-icon">❌</div>
                    <div>Não foi possível realizar a busca. Tente novamente.</div>
                </div>
            `;
            searchResults.classList.add('visible');
        }
    }
}, 300);

// Adiciona o evento de input
searchRamal.addEventListener('input', handleSearch);

// Fechar resultados ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        searchResults.classList.remove('visible');
    }
});

// Manha o foco no campo de busca ao clicar nos resultados
searchResults.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Função debounce para melhorar performance da busca
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Preview da imagem selecionada
photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    currentFile = file;
    
    // Verificar se é uma imagem
    if (!file.type.match('image.*')) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Por favor, selecione um arquivo de imagem válido.'
        });
        return;
    }
    
    // Verificar tamanho do arquivo (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'Arquivo muito grande',
            text: 'A imagem não pode ser maior que 2MB.'
        });
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        profilePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        saveBtn.disabled = false;
    };
    reader.readAsDataURL(file);
});

// Atualizar botão de salvar quando o status for alterado
statusOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remover classe ativa de todos os botões
        statusOptions.forEach(btn => btn.classList.remove('active'));
        
        // Adicionar classe ativa ao botão clicado
        option.classList.add('active');
        
        // Atualizar valor do input hidden
        userStatusInput.value = option.dataset.status;
        
        // Habilitar botão de salvar quando o status for alterado
        saveBtn.disabled = false;
    });
});

// Salvar alterações (foto e/ou status)
saveBtn.addEventListener('click', async () => {
    console.log('=== INÍCIO DO PROCESSO DE SALVAMENTO ===');
    console.log('1. Botão de salvar clicado!');
    
    if (!selectedUser) {
        const errorMsg = 'Nenhum usuário selecionado';
        console.error('ERRO:', errorMsg);
        await Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: errorMsg
        });
        return;
    }
    
    // Verificar se o Firebase foi inicializado corretamente
    if (!db) {
        console.error('ERRO: Firebase não foi inicializado corretamente');
        await Swal.fire({
            icon: 'error',
            title: 'Erro de Conexão',
            text: 'Não foi possível conectar ao banco de dados. Por favor, recarregue a página e tente novamente.'
        });
        return;
    }
    
    try {
        console.log('2. Usuário selecionado:', {
            id: selectedUser.id,
            nome: selectedUser.name,
            statusAtual: selectedUser.status
        });
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';
        
        // Verificar se há um status selecionado
        if (!userStatusInput) {
            console.error('3. ERRO: Elemento userStatusInput não encontrado no DOM');
            throw new Error('Elemento de status não encontrado');
        }
        
        if (!userStatusInput.value) {
            console.warn('3. Nenhum status selecionado, usando padrão (available)');
            userStatusInput.value = 'available';
        } else {
            console.log('3. Status selecionado:', userStatusInput.value);
        }
        
        // Verificar se o valor do status é válido
        const validStatuses = ['available', 'busy', 'meeting', 'lunch', 'away', 'vacation'];
        if (!validStatuses.includes(userStatusInput.value)) {
            console.error('4. ERRO: Status inválido:', userStatusInput.value);
            throw new Error('Status selecionado é inválido');
        }
        
        const updates = {
            status: userStatusInput.value,
            updatedAt: new Date().toISOString(),
            _debug_updatedBy: 'editar-foto-js',
            _debug_timestamp: new Date().toISOString(),
            _debug_userAgent: navigator.userAgent
        };
        
        console.log('4. Dados que serão salvos:', JSON.stringify(updates, null, 2));
        
        console.log('4. Atualizações a serem salvas:', JSON.stringify(updates, null, 2));
        
        // Verificar se a foto deve ser removida
        if (selectedUser.shouldRemovePhoto) {
            console.log('5. Removendo foto do perfil...');
            updates.photoBase64 = null;
            updates.photoUrl = null; // Se estiver usando URL em vez de base64
            hasPhoto = false;
        } 
        // Se houver uma nova imagem, processá-la
        else if (currentFile) {
            console.log('5. Processando nova imagem...');
            try {
                const base64Image = await processImage(currentFile);
                updates.photoBase64 = base64Image;
                hasPhoto = true;
                console.log('6. Imagem processada com sucesso! Tamanho:', base64Image.length, 'bytes');
            } catch (error) {
                const errorMsg = `Erro ao processar imagem: ${error.message}`;
                console.error('ERRO:', errorMsg, error);
                throw new Error(errorMsg);
            }
        } else {
            console.log('5. Nenhuma alteração na imagem');
        }
        
        // Atualizar o documento do usuário
        console.log('7. Preparando para atualizar o documento no Firebase...');
        const userRef = doc(db, 'people', selectedUser.id);
        
        // Verificar se a referência ao documento é válida
        if (!userRef) {
            throw new Error('Referência ao documento inválida');
        }
        
        console.log('8. Referência do documento:', {
            collection: 'people',
            docId: selectedUser.id,
            path: userRef.path
        });
        
        try {
            console.log('9. Enviando atualização para o Firebase...');
            await updateDoc(userRef, updates);
// Notificar em tempo real outros clientes
socket.emit('updateStatus', { userId: selectedUser.id, status: updates.status });
            console.log('10. Documento atualizado com sucesso no Firebase!');
            
            // Verificar se a atualização foi realmente salva
            const updatedDoc = await getDoc(userRef);
            if (updatedDoc.exists()) {
                console.log('11. Verificação pós-atualização:', {
                    status: updatedDoc.data().status,
                    updatedAt: updatedDoc.data().updatedAt,
                    hasPhoto: !!(updatedDoc.data().photoBase64 || updatedDoc.data().photoUrl)
                });
                
                // Mostrar mensagem de sucesso
                if (selectedUser.shouldRemovePhoto) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Foto removida!',
                        text: 'A foto foi removida com sucesso e as iniciais foram restauradas.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // Resetar a flag de remoção
                    selectedUser.shouldRemovePhoto = false;
                } else if (currentFile) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Foto atualizada!',
                        text: 'A foto de perfil foi atualizada com sucesso.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Alterações salvas!',
                        text: 'As alterações foram salvas com sucesso.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } else {
                console.warn('11. Documento não encontrado após a atualização!');
            }
        } catch (error) {
            console.error('ERRO ao atualizar documento no Firebase:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // Verificar regras de segurança
            console.warn('Verificando permissões...');
            try {
                const testRef = doc(db, 'people', 'test-permission');
                await setDoc(testRef, { test: new Date().toISOString() });
                console.log('Permissão de escrita confirmada na coleção people');
            } catch (permError) {
                console.error('ERRO DE PERMISSÃO:', {
                    code: permError.code,
                    message: permError.message
                });
            }
            
            throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
        }
        
        // Atualizar a visualização
        if (updates.photoBase64) {
            selectedUser.photoBase64 = updates.photoBase64;
            const img = profilePreview.querySelector('img');
            if (img) {
                img.src = updates.photoBase64;
            } else {
                profilePreview.innerHTML = `<img src="${updates.photoBase64}" alt="${selectedUser.name}">`;
            }
            
            // Atualizar o preview da imagem
            const previewImg = document.createElement('img');
            previewImg.src = updates.photoBase64;
            previewImg.alt = selectedUser.name;
            profilePreview.innerHTML = '';
            profilePreview.appendChild(previewImg);
        }
        
        // Atualizar o status no objeto do usuário
        selectedUser.status = updates.status;
        
        // Atualizar o botão de status ativo
        statusOptions.forEach(option => {
            if (option.dataset.status === updates.status) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
        
        // Resetar o input de arquivo após o upload
        currentFile = null;
        photoInput.value = '';
        
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível salvar as alterações. Tente novamente.'
        });
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
    }
});

// Fechar resultados ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        searchResults.innerHTML = '';
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');
    
    // Verificar se há um ID de usuário na URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    // Log dos parâmetros da URL
    console.log('Parâmetros da URL:', {
        userId: userId,
        userStatusInput: userStatusInput ? 'Encontrado' : 'Não encontrado',
        statusOptions: statusOptions.length
    });
    
    if (userId) {
        console.log('Carregando usuário pelo ID:', userId);
        // Carregar informações do usuário diretamente pelo ID
        loadUserById(userId);
    } else {
        console.log('Nenhum ID de usuário encontrado na URL');
    }
});

// Função para carregar usuário por ID
async function loadUserById(userId) {
    try {
        console.log(`Buscando usuário com ID: ${userId}`);
        const userRef = doc(db, 'people', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log('Dados do usuário encontrados:', {
                id: userId,
                name: userData.name,
                status: userData.status || 'não definido',
                hasPhoto: !!(userData.photoBase64 || userData.photoUrl)
            });
            
            // Verificar se o status existe, senão definir como 'available'
            if (!userData.status) {
                userData.status = 'available';
                console.log('Status não definido, usando padrão:', userData.status);
            }
            
            selectPerson({ id: userId, ...userData });
        } else {
            console.error('Usuário não encontrado no Firestore:', userId);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Usuário não encontrado!'
            });
        }
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: `Não foi possível carregar as informações do usuário: ${error.message}`
        });
    }
}
