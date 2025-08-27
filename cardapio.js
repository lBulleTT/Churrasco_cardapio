const menu = document.getElementById('menu');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
let cart = [];
let taxaEntrega = 0;

const tipoServicoSelect = document.getElementById('tipoServico');
const camposEntregaDiv = document.getElementById('camposEntrega');
const camposLocalDiv = document.getElementById('camposLocal');
const observacoesTextarea = document.getElementById('observacoes');

// --- URL da sua planilha Google Sheets publicada como CSV ---

const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ11A1vCzx45r2RdjY_KFN5S5itwzWOqWLq7jQygO_SL0HCSNqO8uZvBjLAGMJnDvW73DnfNyRPzWiD/pub?output=csv';

// Armazenará os produtos lidos da planilha
let produtos = [];

// --- Função para carregar os produtos da planilha ---
async function carregarProdutosDaPlanilha() {
    try {
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();

        // Analisar o CSV: divide por linha e ignora linhas vazias
        const linhas = csvText.trim().split('\n').filter(line => line.trim() !== '');
        if (linhas.length === 0) {
            console.warn('CSV vazio ou com apenas cabeçalho.');
            menu.innerHTML = '<p style="text-align: center; color: gray;">Nenhum produto cadastrado no cardápio.</p>';
            return;
        }

        const cabecalho = linhas[0].split(',').map(col => col.trim().replace(/^"|"$/g, '')); // Remove aspas duplas dos cabeçalhos
        
        const produtosTemp = {}; // Objeto temporário para agrupar por categoria

        for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].split(',').map(val => val.trim().replace(/^"|"$/g, '')); // Remove aspas duplas dos valores
            
            const item = {};
            cabecalho.forEach((col, index) => {
                // Atribui o valor à coluna correta, mesmo que faltem valores no final da linha CSV
                item[col] = valores[index] !== undefined ? valores[index] : ''; 
            });

            // Converte preços para número. Se o valor for vazio/inválido, usa 0.
            const preco1 = parseFloat(item.Preco_Simples_Meia) || 0;
            const preco2 = parseFloat(item.Preco_Completo_Inteira) || undefined;
            // Verifica a disponibilidade. Se a coluna 'Disponivel' for 'SIM', então está disponível.
            const disponivel = item.Disponivel.toUpperCase() === 'SIM';

            // Mapeamento de imagens de categoria (fixas no código, podem ser adicionadas na planilha também)
            let imagemCategoria = '';
            switch (item.Categoria) {
                case 'Espetinhos': imagemCategoria = 'https://i.postimg.cc/Hx6RXjrr/Crie-uma-imagem-de-alta-qualidade-e-com-foco-n-tido-para-representar-um-Espetinho-de-Carne-no-card.jpg'; break;
                case 'Porções': imagemCategoria = 'https://i.postimg.cc/4yQ6m2BZ/Crie-uma-imagem-de-fundo-banner-para-a-categoria-Por-es-de-um-card-pio-online-de-churrascaria-A.jpg'; break;
                case 'Caldos e Sopas': imagemCategoria = 'https://i.postimg.cc/28BqcK45/Claro-Para-a-se-o-de-Caldos-e-Sopas-o-prompt-deve-evocar-calor-conforto-e-a-riqueza-dos-sabor.jpg'; break;
                case 'Bebidas': imagemCategoria = 'https://i.ytimg.com/vi/HwHaqjmUp8Q/maxresdefault.jpg'; break;
                case 'Cervejas e Mais': // Não tinha imagem específica, se precisar adicione aqui
                default: imagemCategoria = ''; // Nenhuma imagem padrão
            }

            if (!produtosTemp[item.Categoria]) {
                produtosTemp[item.Categoria] = {
                    categoria: item.Categoria,
                    imagem: imagemCategoria,
                    itens: []
                };
            }
            
            // Adiciona o item. Se não disponível, o preço será 0 para que seja marcado como "EM FALTA".
            if (preco2 !== undefined) {
                produtosTemp[item.Categoria].itens.push([item.Nome, disponivel ? preco1 : 0, disponivel ? preco2 : 0]);
            } else {
                produtosTemp[item.Categoria].itens.push([item.Nome, disponivel ? preco1 : 0]);
            }
        }
        
        produtos = Object.values(produtosTemp); // Converte o objeto temporário de volta para um array
        renderMenu(); // Renderiza o menu após carregar os produtos
        console.log('✅ Produtos carregados da planilha!', produtos);

    } catch (error) {
        console.error('❌ Erro ao carregar produtos da planilha:', error);
        menu.innerHTML = '<p style="text-align: center; color: red;">Não foi possível carregar o cardápio. Por favor, verifique a URL da planilha ou sua conexão.</p>';
    }
}

// --- FUNÇÕES DE LÓGICA DO CARDÁPIO ---

function renderMenu() {
    menu.innerHTML = '';
    produtos.forEach(sec => {
        const section = document.createElement('div');
        section.classList.add('section');

        section.innerHTML = `
            <h2>${sec.categoria}</h2>
            ${sec.imagem ? `<img class="img-banner" src="${sec.imagem}" alt="${sec.categoria}">` : ''}
            <table>
                <tr><th>Item</th><th>Preço</th><th>Ações</th></tr>
                ${sec.itens.map(([nome, preco1, preco2]) => {
                    // Ajuste: Remove espaços, parênteses e caracteres não alfanuméricos para IDs mais robustos
                    const baseItemId = nome.replace(/\s/g, '-').replace(/[()]/g, '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase(); 
                    
                    const emFalta1 = preco1 === 0;
                    const emFalta2 = preco2 === 0;

                    if (preco2 !== undefined) {
                        const tipo1 = sec.categoria === 'Porções' ? 'Meia Porção' : 'Simples';
                        const tipo2 = sec.categoria === 'Porções' ? 'Porção Inteira' : 'Completo';
                        const itemId1 = `${baseItemId}-${tipo1.replace(/\s/g, '-')}`;
                        const itemId2 = `${baseItemId}-${tipo2.replace(/\s/g, '-')}`;

                        return `
                            <tr ${emFalta1 ? 'class="em-falta"' : ''}>
                                <td>${nome} (${tipo1})</td>
                                <td>${emFalta1 ? 'EM FALTA' : `R$${preco1.toFixed(2)}`}</td>
                                <td>
                                    <div class="quantidade-container">
                                        ${emFalta1 ?
                                            '<span class="indisponivel">Indisponível</span>' :
                                            `<button class="add" data-item="${nome} (${tipo1})" data-preco="${preco1}">➕</button>
                                            <span id="qty-${itemId1}" class="contador-quantidade">0</span>
                                            <button class="remove" data-item="${nome} (${tipo1})">➖</button>`
                                        }
                                    </div>
                                </td>
                            </tr>
                            <tr ${emFalta2 ? 'class="em-falta"' : ''}>
                                <td>${nome} (${tipo2})</td>
                                <td>${emFalta2 ? 'EM FALTA' : `R$${preco2.toFixed(2)}`}</td>
                                <td>
                                    <div class="quantidade-container">
                                        ${emFalta2 ?
                                            '<span class="indisponivel">Indisponível</span>' :
                                            `<button class="add" data-item="${nome} (${tipo2})" data-preco="${preco2}">➕</button>
                                            <span id="qty-${itemId2}" class="contador-quantidade">0</span>
                                            <button class="remove" data-item="${nome} (${tipo2})">➖</button>`
                                        }
                                    </div>
                                </td>
                            </tr>
                        `;
                    } else {
                        const emFalta = preco1 === 0;
                        const itemId = baseItemId;

                        return `
                            <tr ${emFalta ? 'class="em-falta"' : ''}>
                                <td>${nome}</td>
                                <td>${emFalta ? 'EM FALTA' : `R$${preco1.toFixed(2)}`}</td>
                                <td>
                                    <div class="quantidade-container">
                                        ${emFalta ?
                                            '<span class="indisponivel">Indisponível</span>' :
                                            `<button class="add" data-item="${nome}" data-preco="${preco1}">➕</button>
                                            <span id="qty-${itemId}" class="contador-quantidade">0</span>
                                            <button class="remove" data-item="${nome}">➖</button>`
                                        }
                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                }).join('')}
            </table>
        `;
        menu.appendChild(section);
    });

    document.querySelectorAll('.add').forEach(button => {
        button.addEventListener('click', (event) => {
            const item = event.currentTarget.dataset.item;
            const preco = parseFloat(event.currentTarget.dataset.preco);
            if (preco > 0) {
                adicionar(item, preco);
            } else {
                alert("Este item está indisponível no momento.");
            }
        });
    });

    document.querySelectorAll('.remove').forEach(button => {
        button.addEventListener('click', (event) => {
            const item = event.currentTarget.dataset.item;
            remover(item);
        });
    });

    atualizarQuantidadesBotoes();
}

function adicionar(item, preco) {
    const itemExistente = cart.find(el => el.item === item);
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        cart.push({ item, preco, quantidade: 1 });
    }
    atualizarCarrinho();
    atualizarQuantidadesBotoes();
}

function remover(item) {
    const itemExistente = cart.find(el => el.item === item);
    if (itemExistente) {
        if (itemExistente.quantidade > 1) {
            itemExistente.quantidade--;
        } else {
            cart = cart.filter(el => el.item !== item);
        }
    }
    atualizarCarrinho();
    atualizarQuantidadesBotoes();
}

function atualizarCarrinho() {
    cartItems.innerHTML = '';
    let total = 0;

    const groupedCart = {};
    cart.forEach(item => {
        if (groupedCart[item.item]) {
            groupedCart[item.item].quantidade += item.quantidade;
        } else {
            groupedCart[item.item] = { ...item };
        }
    });

    for (const itemKey in groupedCart) {
        const { item, preco, quantidade } = groupedCart[itemKey];
        const subtotal = preco * quantidade;
        total += subtotal;
        const li = document.createElement('li');
        // CORREÇÃO: Sintaxe correta para template literal
        li.textContent = `${quantidade}x ${item} - R$${subtotal.toFixed(2)}`; 
        cartItems.appendChild(li);
    }

    const totalComTaxa = total + taxaEntrega;

    document.getElementById('taxaEntregaValor').textContent = `R$ ${taxaEntrega.toFixed(2)}`;
    // CORREÇÃO: Sintaxe correta para template literal
    cartTotal.textContent = `R$ ${totalComTaxa.toFixed(2)}`; 
}

function atualizarQuantidadesBotoes() {
    document.querySelectorAll('.contador-quantidade').forEach(span => {
        span.textContent = '0';
    });

    cart.forEach(cartItem => {
        const itemId = cartItem.item.replace(/\s/g, '-').replace(/[()]/g, '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
        const qtySpan = document.getElementById(`qty-${itemId}`);
        if (qtySpan) {
            qtySpan.textContent = cartItem.quantidade;
        } else {
            const parentButton = document.querySelector(`button.add[data-item="${cartItem.item}"]`);
            if (parentButton) {
                const spanInsideButton = parentButton.nextElementSibling;
                if (spanInsideButton && spanInsideButton.classList.contains('contador-quantidade')) {
                    spanInsideButton.textContent = cartItem.quantidade;
                }
            } else {
                console.warn(`Contador de quantidade não encontrado para: ${cartItem.item}`);
            }
        }
    });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c;
    return distancia;
}

async function calcularTaxaEntrega(endereco) {
    if (tipoServicoSelect.value !== 'entrega') {
        taxaEntrega = 0;
        document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
        atualizarCarrinho();
        return;
    }

    if (!endereco || endereco.trim().length < 5) {
        taxaEntrega = 0;
        const taxaElement = document.getElementById('taxaEntregaValor');
        if (taxaElement) {
            taxaElement.textContent = 'R$ 0,00';
        }
        atualizarCarrinho();
        return;
    }

    console.log('🔍 Calculando taxa para:', endereco);

    try {
        const latChurrascaria = -22.890104878846042;
        const lonChurrascaria = -43.47785352523603;

        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=AIzaSyAS_CW0_VbxGw_eBtZJs7s7PAd5al2wOcY`;
        console.log('🌐 URL da API:', apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log('📡 Resposta da API:', data);

        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            const latCliente = location.lat;
            const lonCliente = location.lng;

            console.log('📍 Coordenadas encontradas:', { latCliente, lonCliente });

            const distancia = calcularDistancia(latChurrascaria, lonChurrascaria, latCliente, lonCliente);
            console.log('📏 Distância calculada:', distancia.toFixed(3), 'km');

            if (distancia <= 0.97) {
                taxaEntrega = 3.00;
                console.log('✅ Taxa aplicada: R$ 3,00 (até 0.97km)');
            } else {
                taxaEntrega = 5.00;
                console.log('✅ Taxa aplicada: R$ 5,00 (acima de 0.97km)');
            }

            const taxaElement = document.getElementById('taxaEntregaValor');
            if (taxaElement) {
                // CORREÇÃO: Sintaxe correta para template literal
                taxaElement.textContent = `R$ ${taxaEntrega.toFixed(2)} (${distancia.toFixed(2)}km)`; 
            }

            atualizarCarrinho();

        } else {
            console.error('❌ Erro na API:', data.status, data.error_message || 'Endereço não encontrado');
            await calcularTaxaComOpenStreetMap(endereco);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        await calcularTaxaComOpenStreetMap(endereco);
    }
}

async function calcularTaxaComOpenStreetMap(endereco) {
    if (tipoServicoSelect.value !== 'entrega') {
        taxaEntrega = 0;
        document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
        atualizarCarrinho();
        return;
    }

    try {
        console.log('🔄 Tentando com OpenStreetMap...');

        const latChurrascaria = -22.890276240998745;
        const lonChurrascaria = -43.477735446224855;

        const enderecoCompleto = `${endereco}, Rio de Janeiro, RJ, Brasil`;

        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1`);
        const data = await response.json();

        console.log('🗺️ Resposta OpenStreetMap:', data);

        if (data && data.length > 0) {
            const latCliente = parseFloat(data[0].lat);
            const lonCliente = parseFloat(data[0].lon);

            console.log('📍 Coordenadas OSM:', { latCliente, lonCliente });

            const distancia = calcularDistancia(latChurrascaria, lonChurrascaria, latCliente, lonCliente);
            console.log('📏 Distância OSM:', distancia.toFixed(3), 'km');

            if (distancia <= 0.97) {
                taxaEntrega = 3.00;
                console.log('✅ Taxa OSM: R$ 3,00 (até 0.97km)');
            } else {
                taxaEntrega = 5.00;
                console.log('✅ Taxa OSM: R$ 5,00 (acima de 0.97km)');
            }

            const taxaElement = document.getElementById('taxaEntregaValor');
            if (taxaElement) {
                // CORREÇÃO: Sintaxe correta para template literal
                taxaElement.textContent = `R$ ${taxaEntrega.toFixed(2)} (${distancia.toFixed(2)}km)`; 
            }

            atualizarCarrinho();
        } else {
            console.warn('⚠️ Nenhuma coordenada encontrada, usando taxa padrão');
            usarTaxaPadrao();
        }
    } catch (error) {
        console.error('❌ Erro OpenStreetMap:', error);
        usarTaxaPadrao();
    }
}

function usarTaxaPadrao() {
    if (tipoServicoSelect.value === 'entrega') {
        taxaEntrega = 5.00;
        const taxaElement = document.getElementById('taxaEntregaValor');
        if (taxaElement) {
            taxaElement.textContent = `R$ ${taxaEntrega.toFixed(2)} (taxa padrão)`;
        }
        console.log('⚠️ Usando taxa padrão: R$ 5,00');
    } else {
        taxaEntrega = 0;
        document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
    }
    atualizarCarrinho();
}

async function finalizarCompra() {
    let nomeCliente, enderecoOuMesa, tipoServicoSelecionado;
    const pagamento = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value;
    const observacoes = observacoesTextarea.value.trim();

    tipoServicoSelecionado = tipoServicoSelect.value;

    if (tipoServicoSelecionado === 'entrega') {
        nomeCliente = document.getElementById('nomeCliente').value.trim();
        enderecoOuMesa = document.getElementById('enderecoCliente').value.trim();
        if (!nomeCliente || !enderecoOuMesa || enderecoOuMesa.length < 5) {
            alert("Por favor, preencha seu nome e um endereço de entrega válido para o serviço de entrega.");
            return;
        }
        await calcularTaxaEntrega(enderecoOuMesa);
    } else {
        nomeCliente = document.getElementById('nomeClienteLocal').value.trim();
        enderecoOuMesa = document.getElementById('numeroMesa').value.trim();
        if (!nomeCliente || !enderecoOuMesa) {
            alert("Por favor, preencha seu nome e o número da mesa para comer no restaurante.");
            return;
        }
        taxaEntrega = 0;
        document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
    }

    if (cart.length === 0) {
        alert("Adicione itens ao carrinho antes de finalizar!");
        return;
    }

    let mensagem = `📦 *Novo Pedido*%0A`;
    mensagem += `👤 Cliente: ${nomeCliente}%0A`;

    if (tipoServicoSelecionado === 'entrega') {
        mensagem += `📍 Endereço: ${enderecoOuMesa}%0A`;
    } else {
        mensagem += `🍽️ Mesa: ${enderecoOuMesa}%0A`;
    }

    mensagem += `💳 Pagamento: ${pagamento}%0A`;

    if (pagamento === 'Dinheiro' && troco) {
        mensagem += `💰 Troco para: R$${parseFloat(troco).toFixed(2)}%0A`;
    }

    if (observacoes) {
        mensagem += `📝 Observações: ${observacoes}%0A`;
    }

    mensagem += `%0A🛒 *Itens do Pedido:*%0A`;

    let total = 0;
    cart.forEach(({ item, preco, quantidade }) => {
        const subtotal = preco * quantidade;
        // CORREÇÃO: Sintaxe correta para template literal
        mensagem += `- ${quantidade}x ${item} (R$${subtotal.toFixed(2)})%0A`; 
        total += subtotal;
    });

    if (tipoServicoSelecionado === 'entrega') {
        mensagem += `%0A🚚 *Taxa de Entrega:* R$ ${taxaEntrega.toFixed(2)}%0A`;
    } else {
        mensagem += `%0A*Serviço:* Comer no local%0A`;
    }
    
    mensagem += `%0A💵 *Total:* R$ ${(total + taxaEntrega).toFixed(2)}%0A`;

    if (pagamento === 'Pix') {
        mensagem += `%0A🔢 *Chave Pix:* 21969405521%0A📎 Envie o comprovante por aqui.`;
    } else if (pagamento === 'Cartão') {
        mensagem += `%0A💳 Pagamento com cartão será realizado na ${tipoServicoSelecionado === 'entrega' ? 'entrega' : 'no local'}.`;
    }

    const numero = '5521969405521';
    // CORREÇÃO: Sintaxe correta para template literal
    const url = `https://wa.me/${numero}?text=${mensagem}`; 
    window.open(url, '_blank');

    cart = [];
    taxaEntrega = 0;
    atualizarCarrinho();
    atualizarQuantidadesBotoes();
    document.getElementById('nomeCliente').value = '';
    document.getElementById('enderecoCliente').value = '';
    document.getElementById('nomeClienteLocal').value = '';
    document.getElementById('numeroMesa').value = '';
    document.getElementById('troco').value = '';
    observacoesTextarea.value = '';
}

function copiarPedido() {
    if (cart.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }

    let nomeCliente, enderecoOuMesa, tipoServicoSelecionado;
    const pagamento = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value.trim();
    const observacoes = observacoesTextarea.value.trim();

    tipoServicoSelecionado = tipoServicoSelect.value;

    if (tipoServicoSelecionado === 'entrega') {
        nomeCliente = document.getElementById('nomeCliente').value.trim() || 'Cliente';
        enderecoOuMesa = document.getElementById('enderecoCliente').value.trim() || 'Endereço não informado';
    } else {
        nomeCliente = document.getElementById('nomeClienteLocal').value.trim() || 'Cliente';
        enderecoOuMesa = document.getElementById('numeroMesa').value.trim() ? `Mesa: ${document.getElementById('numeroMesa').value.trim()}` : 'Mesa não informada';
    }

    let texto = `Pedido para Churrasco do Rogério\n\n`;
    texto += `👤 Cliente: ${nomeCliente}\n`;
    texto += `Tipo de Serviço: ${tipoServicoSelecionado === 'entrega' ? 'Entrega' : 'Comer no Local'}\n`;
    texto += tipoServicoSelecionado === 'entrega' ? `📍 Endereço: ${enderecoOuMesa}\n` : `🍽️ ${enderecoOuMesa}\n`;

    if (observacoes) {
        texto += `📝 Observações: ${observacoes}\n`;
    }
    texto += `\n🛒 Itens do Pedido:\n`;

    let totalItens = 0;
    cart.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        // CORREÇÃO: Sintaxe correta para template literal
        texto += `🍖 ${item.quantidade}x ${item.item} - R$ ${subtotal.toFixed(2)}\n`; 
        totalItens += subtotal;
    });

    if (tipoServicoSelecionado === 'entrega') {
        texto += `\n🚚 Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\n`;
    } else {
        texto += `\nServiço: Comer no local\n`;
    }
    
    texto += `💰 Total: R$ ${(totalItens + taxaEntrega).toFixed(2)}\n📦 Pagamento: ${pagamento}`;
    if (pagamento.toLowerCase() === 'dinheiro' && troco) {
        texto += `\n💵 Troco para: R$ ${parseFloat(troco).toFixed(2)}`;
    }

    navigator.clipboard.writeText(texto).then(() => {
        alert('Pedido copiado com sucesso!');
    });
}

function toggleModoNoturno() {
    document.body.classList.toggle('modo-noturno');
}

document.getElementById('pagamento').addEventListener('change', function () {
    const divTroco = document.getElementById('trocoDiv');
    divTroco.style.display = this.value === 'Dinheiro' ? 'block' : 'none';
});

tipoServicoSelect.addEventListener('change', function() {
    if (this.value === 'entrega') {
        camposEntregaDiv.style.display = 'block';
        camposLocalDiv.style.display = 'none';
        const enderecoAtual = document.getElementById('enderecoCliente').value.trim();
        if (enderecoAtual.length >= 5) {
            calcularTaxaEntrega(enderecoAtual);
        } else {
            taxaEntrega = 0;
            document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
            atualizarCarrinho();
        }
    } else {
        camposEntregaDiv.style.display = 'none';
        camposLocalDiv.style.display = 'block';
        taxaEntrega = 0;
        document.getElementById('taxaEntregaValor').textContent = 'R$ 0,00';
        atualizarCarrinho();
    }
});

document.getElementById('enderecoCliente').addEventListener('blur', function() {
    if (tipoServicoSelect.value === 'entrega') {
        const endereco = this.value.trim();
        if (endereco.length >= 5) {
            calcularTaxaEntrega(endereco);
        } else {
            taxaEntrega = 0;
            const taxaElement = document.getElementById('taxaEntregaValor');
            if (taxaElement) {
                taxaElement.textContent = 'R$ 0,00';
            }
            atualizarCarrinho();
        }
    }
});

let timeoutId;
document.getElementById('enderecoCliente').addEventListener('input', function() {
    if (tipoServicoSelect.value === 'entrega') {
        clearTimeout(timeoutId);
        const endereco = this.value.trim();

        if (endereco.length >= 5) {
            timeoutId = setTimeout(() => {
                calcularTaxaEntrega(endereco);
            }, 2000);
        } else {
            taxaEntrega = 0;
            const taxaElement = document.getElementById('taxaEntregaValor');
            if (taxaElement) {
                taxaElement.textContent = 'R$ 0,00';
            }
            atualizarCarrinho();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosDaPlanilha(); // Inicia o carregamento dos produtos
    tipoServicoSelect.dispatchEvent(new Event('change'));
});
