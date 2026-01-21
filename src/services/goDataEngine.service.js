
/**
 * ====================================================
 * SERVIÇO DATA ENGINE - COMUNICAÇÃO COM GO
 * ====================================================
 * 
 * Este serviço encapsula TODAS as operações de dados
 * disponíveis no Go Data Engine.
 * 
 * Endpoints disponíveis:
 * - /data/select (Advanced Select)
 * - /data/join-select (Join Select)
 * - /data/insert (Insert único)
 * - /data/batch-insert (Insert em lote)
 * - /data/update (Update único)
 * - /data/batch-update (Update em lote)
 * - /data/delete (Delete hard/soft)
 * - /data/aggregate (Agregações)
 */
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const GO_API_URL = process.env.GO_API_URL || "http://localhost:8080";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;
/**
 * Headers padrão para todas as requisições
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_TOKEN,
  };
}
/**
 * Função base para requisições ao Go
 */
async function requestToGo(endpoint, payload) {
  try {
    const res = await axios.post(`${GO_API_URL}${endpoint}`, payload, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return res.data;
  } catch (err) {
    console.error(
      `❌ Erro na requisição para ${endpoint}:`,
      err.response?.data || err.message
    );
    throw new Error(err.response?.data || err.message);
  }
}


/* ====================================================
   INSERT - INSERÇÕES
==================================================== */
/**
 * ====================================================
 * INSERT - Inserção de registro único
 * ====================================================
 *
 * Envia dados para o CORE (Go) inserir um único registro
 * respeitando o isolamento por projeto e instância.
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,
 *   id_instancia: number,
 *   table: string,
 *   data: object
 * }
 *
 * Campos obrigatórios:
 * - project_id
 * - id_instancia
 * - table
 * - data (mínimo 1 campo)
 *
 * @param {number} project_id
 * @param {number} id_instancia
 * @param {string} table
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
async function insert(project_id, id_instancia, table, data) {
  // 🔹 Estrutura padrão da rota INSERT
  const payload = {
    project_id: project_id ?? null,
    id_instancia: id_instancia ?? null,
    table: table ?? "",
    data: data ?? {},
  };
  // 🔹 Validação mínima no distribuidor
  if (!payload.project_id)
    throw new Error("project_id é obrigatório");
  if (!payload.id_instancia)
    throw new Error("id_instancia é obrigatório");
  if (!payload.table)
    throw new Error("table é obrigatória");
  if (Object.keys(payload.data).length === 0)
    throw new Error("data não pode ser vazio");
  // 🔹 Envia para o CORE
  return requestToGo("/data/insert", payload);
}
/**
 * ====================================================
 * BATCH INSERT - Inserção de múltiplos registros
 * ====================================================
 *
 * Envia múltiplos registros para o CORE (Go) inserir
 * respeitando o isolamento por projeto e instância.
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,      // ID do projeto
 *   id_instancia: number,    // ID da instância
 *   table: string,           // Nome da tabela
 *   data: Array<object>      // Array de registros
 * }
 *
 * Cada objeto em data será complementado automaticamente
 * com id_instancia se não estiver presente.
 *
 * Estrutura de retorno esperada:
 * {
 *   success: boolean,        // true se operação OK
 *   message: string,         // Mensagem de status
 *   count: number            // Quantidade de registros inseridos
 * }
 *
 * @param {number} project_id
 * @param {number} id_instancia
 * @param {string} table
 * @param {Object[]} data
 *
 * @example
 * batchInsert(1, 10, "produtos", [
 *   { nome: "Produto 1", preco: 10.50 },
 *   { nome: "Produto 2", preco: 20.00 },
 *   { nome: "Produto 3", preco: 15.75 }
 * ])
 *
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 */
async function batchInsert(project_id, id_instancia, table, data) {
  // 🔹 Estrutura padrão pré-definida
  const payload = {
    project_id: project_id ?? null,
    id_instancia: id_instancia ?? null,
    table: table ?? "",
    data: Array.isArray(data) ? data.map(row => ({
      ...row,
      id_instancia: row.id_instancia ?? id_instancia // garante id_instancia
    })) : [],
  };
  // 🔹 Validações mínimas
  if (!payload.project_id)
    throw new Error("project_id é obrigatório");
  if (!payload.id_instancia)
    throw new Error("id_instancia é obrigatório");
  if (!payload.table)
    throw new Error("table é obrigatória");
  if (!Array.isArray(payload.data) || payload.data.length === 0)
    throw new Error("data (array) não pode ser vazio");
  // 🔹 Envia para o CORE (Go)
  return requestToGo("/data/batch-insert", payload);
}

ainda eu disponibiliso para outra api
/**
 * ====================================================
 * CONTROLLER GO DATA ENGINE
 * ====================================================
 */
import goDataEngineService from "../../services/goDataEngine.service.js";
/* ----------------------
   CRUD / OPERAÇÕES
---------------------- */
// INSERT único
export async function insertRecord(req, res) {
  try {
    const { project_id, id_instancia, table, data } = req.body;
    if (!project_id || !id_instancia || !table || !data)
      return res.status(400).json({ success: false, message: "project_id, id_instancia, table e data são obrigatórios" });
    const result = await goDataEngineService.insert(project_id, id_instancia, table, data);
    res.json({ success: true, message: "Registro inserido com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no insert:", err.message);
    res.status(500).json({ success: false, message: "Erro ao inserir registro", error: err.message });
  }
}
// Batch Insert
export async function batchInsert(req, res) {
  try {
    const { project_id, id_instancia, table, data } = req.body;
    if (!project_id || !id_instancia || !table || !Array.isArray(data))
      return res.status(400).json({ success: false, message: "project_id, id_instancia, table e data (array) são obrigatórios" });
    const result = await goDataEngineService.batchInsert(project_id, id_instancia, table, data);
    res.json({ success: true, message: "Batch insert realizado com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no batchInsert:", err.message);
    res.status(500).json({ success: false, message: "Erro ao inserir registros em lote", error: err.message });
  }
}

consumo final

// services/goData.service.js
const axios = require("axios");
const API_URL = process.env.NODE_BACKEND_URL;
const API_KEY = process.env.NODE_API_KEY; // ou PROJECT_API_KEY se você mudou o .env
const INSTANCE_ID = process.env.ID_INSTANCIA;
const PROJECT_ID = process.env.PROJECT_ID; // ✅ ADICIONE ESTA LINHA

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

async function callGoEngine(endpoint, payload = {}) {
  try {
    const response = await axios.post(
      `${API_URL}/${endpoint}`,
      {
        project_id: PROJECT_ID,
        id_instancia: INSTANCE_ID,
        ...payload,
      },
      { headers }
    );

    const result = response.data;
    return result.data.data
    // 🔥 NORMALIZAÇÃO GLOBAL DE RETORNO

    // Caso padrão do Go → { success, count, data: [] }
    // ✅ PADRÃO DO GO: { data: { data: [] } }
    if (result?.data?.data && Array.isArray(result.data.data)) {
      return result.data.data;
    }
    // Caso já venha array
    if (Array.isArray(result)) {
      return result;
    }

    // Caso venha objeto único
    if (result && typeof result === "object") {
      return [result];
    }

    // Caso inválido
    return [];

  } catch (err) {
    const erroReal = err.response?.data || err.message;
    console.error(`[GoEngine ERROR] ${endpoint}:`, JSON.stringify(erroReal.error[1], null, 2));
    return []; // 🔥 nunca quebrar quem consome
  }
}



function cleanPayload(payload) {
  const cleaned = {};
  for (const key in payload) {
    const value = payload[key];
    // remove undefined, mantém null, array ou objeto vazio
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
const insert = async ({ table, data }) =>
  callGoEngine("insert", { table, data });
async function criarProfissional(nome, especialidade, img,ativo) {
    if (!nome || nome.trim() === '') {
        throw new Error('Nome do profissional é obrigatório');
    }
    const data = {
        nome: nome.trim(),
        especialidade: especialidade?.trim() || null,
        img: img || null,
        ativo
    }
    console.log(data)
    const result = await goData.insert({
        table: TABLE,
        data: data
    });
    console.log("Erro detalhado:", JSON.stringify(result.error, null, 2));

    return result;
}
olha oque eu pasei e oque deu ero 
{
  nome: 'coort fino',
  especialidade: 'ofisial',
  img: '1768951927113-Gemini_Generated_Image_6d28le6d28le6d28.png',
  ativo: 1
}
[GoEngine ERROR] insert: {
  "success": false,
  "message": "Erro ao inserir registro",
  "error": "[object Object]"
}

pq n ta fasendo  insert onde ta opoblema como resouver olha a estrutura db que nois ta usando to tentando adisiona

Mostrar mais
20:59
Olá! Vejo o problema. Vou te ajudar a resolver esse erro de INSERT. Deixa eu analisar a estrutura toda e identificar onde está o problema.

Problemas Identificados
1. Erro na chamada axios (Sintaxe)
No arquivo goDataEngine.service.js, tem um erro de sintaxe na linha:

javascript
const res = await axios.post`${GO_API_URL}${endpoint}`, payload, {
Problema: Está usando template literals `` ao invés de parênteses ()

Correção:

javascript
const res = await axios.post(`${GO_API_URL}${endpoint}`, payload, {
2. Duplicação de id_instancia
Você está adicionando id_instancia em dois lugares diferentes, o que pode causar conflito:

No batchInsert do service JavaScript
No ExecuteInsert do Go
Correção no goDataEngine.service.js:

javascript
async function insert(project_id, id_instancia, table, data) {
  const payload = {
    project_id: project_id ?? null,
    id_instancia: id_instancia ?? null,
    table: table ?? "",
    data: data ?? {}, // ❌ NÃO adicione id_instancia aqui
  };

  if (!payload.project_id)
    throw new Error("project_id é obrigatório");
  if (!payload.id_instancia)
    throw new Error("id_instancia é obrigatório");
  if (!payload.table)
    throw new Error("table é obrigatória");
  if (Object.keys(payload.data).length === 0)
    throw new Error("data não pode ser vazio");

  return requestToGo("/data/insert", payload);
}
3. Tratamento de erro no consumo final
No goData.service.js, você está tentando acessar result.data.data, mas quando há erro, a estrutura é diferente:

javascript
async function callGoEngine(endpoint, payload = {}) {
  try {
    const response = await axios.post(
      `${API_URL}/${endpoint}`,
      {
        project_id: PROJECT_ID,
        id_instancia: INSTANCE_ID,
        ...payload,
      },
      { headers }
    );

    const result = response.data;

    // ✅ Se houver erro, retorna diretamente
    if (!result.success) {
      console.error(`[GoEngine ERROR] ${endpoint}:`, result);
      throw new Error(result.message || result.error);
    }

    // ✅ Retorna os dados
    return result.data || result;

  } catch (err) {
    const erroReal = err.response?.data || err.message;
    console.error(`[GoEngine ERROR] ${endpoint}:`, erroReal);
    throw err; // 🔥 Propaga o erro ao invés de retornar []
  }
}
4. Log melhorado para debug
Na sua função criarProfissional, melhore o tratamento:

javascript
async function criarProfissional(nome, especialidade, img, ativo) {
    if (!nome || nome.trim() === '') {
        throw new Error('Nome do profissional é obrigatório');
    }
    
    const data = {
        nome: nome.trim(),
        especialidade: especialidade?.trim() || null,
        img: img || null,
        ativo
    };
    
    console.log("📤 Enviando para insert:", data);
    
    try {
        const result = await goData.insert({
            table: TABLE,
            data: data
        });
        
        console.log("✅ Resultado do insert:", result);
        return result;
        
    } catch (error) {
        console.error("❌ Erro no insert:", error.message);
        console.error("❌ Stack:", error.stack);
        throw error;
    }
}
Arquivo Corrigido Completo
goDataEngine.service.js (Corrigido)
Código 
Checklist de Verificação
Para garantir que vai funcionar, verifique:

✅ No Go (handlers/data_handlers.go):
go
// Adicione log para debug
func InsertHandler(w http.ResponseWriter, r *http.Request) {
	var req models.InsertRequest
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Erro ao decodificar JSON: %v", err)
		RespondError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	
	log.Printf("📥 Dados recebidos: %+v", req)
	
	lastID, err := services.ExecuteInsert(req)
	if err != nil {
		log.Printf("❌ Erro no ExecuteInsert: %v", err)
		RespondError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	log.Printf("✅ Insert realizado com sucesso. ID: %d", lastID)
	
	RespondSuccess(w, map[string]interface{}{
		"success": true,
		"message": "Registro inserido com sucesso",
		"id":      lastID,
	})
}
✅ Estrutura da tabela no MySQL:
sql
-- Certifique-se que a tabela existe e tem estas colunas:
CREATE TABLE IF NOT EXISTS `SEU_PROJETO_profissionais` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_instancia` INT NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `especialidade` VARCHAR(255) NULL,
  `img` VARCHAR(500) NULL,
  `ativo` TINYINT(1) DEFAULT 1,
  INDEX `idx_instancia` (`id_instancia`)
);
✅ Variáveis de ambiente (.env):
env
# Node Backend
NODE_BACKEND_URL=http://localhost:3000/api/godata
NODE_API_KEY=sua-api-key-aqui
ID_INSTANCIA=1
PROJECT_ID=1

# Go Backend
GO_API_URL=http://localhost:8080
INTERNAL_TOKEN=seu-token-aqui
🔍 Como Debugar
Execute com os logs habilitados:

javascript
const result = await goData.insert({
    table: 'profissionais',
    data: {
        nome: 'coort fino',
        especialidade: 'ofisial',
        img: '1768951927113-Gemini_Generated_Image_6d28le6d28le6d28.png',
        ativo: 1
    }
});
Você deve ver nos logs:

📤 Payload enviado ao Go: (no Node)
📥 Dados recebidos: (no Go)
✅ Insert realizado com sucesso (no Go)
Se ainda der erro, me mande o log completo que aparece! 🚀






Claude é uma IA e pode cometer erros. Por favor, verifique as respostas.
/**
 * ====================================================
 * SERVIÇO DATA ENGINE - COMUNICAÇÃO COM GO
 * ====================================================
 */
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GO_API_URL = process.env.GO_API_URL || "http://localhost:8080";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

/**
 * Headers padrão para todas as requisições
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_TOKEN,
  };
}

/**
 * Função base para requisições ao Go
 */
async function requestToGo(endpoint, payload) {
  try {
    // ✅ CORREÇÃO: Usar parênteses ao invés de template literals
    const res = await axios.post(`${GO_API_URL}${endpoint}`, payload, {
      headers: getHeaders(),
      timeout: 30000,
    });
    
    return res.data;
  } catch (err) {
    const errorDetail = err.response?.data || err.message;
    console.error(`❌ Erro na requisição para ${endpoint}:`, errorDetail);
    
    // ✅ Lança erro com mais contexto
    throw new Error(
      typeof errorDetail === 'object' 
        ? JSON.stringify(errorDetail) 
        : errorDetail
    );
  }
}

/* ====================================================
   SELECT - CONSULTAS
==================================================== */

/**
 * Advanced Select - SELECT com suporte a JOINs, filtros e paginação
 * 
 * @param {Object} options - Configurações da query
 * @param {number} options.project_id - ID do projeto (obrigatório)
 * @param {number} options.id_instancia - ID da instância (obrigatório)
 * @param {string} options.table - Nome da tabela (obrigatório)
 * @param {string} [options.alias] - Alias da tabela
 * @param {string[]} [options.select] - Colunas a selecionar ["id", "nome"]
 * @param {Object[]} [options.joins] - Array de JOINs
 * @param {Object} [options.where] - Filtros simples {status: "ativo"}
 * @param {string} [options.where_raw] - WHERE customizado
 * @param {string} [options.group_by] - GROUP BY
 * @param {string} [options.having] - HAVING
 * @param {string} [options.order_by] - ORDER BY
 * @param {number} [options.limit] - Limite de resultados
 * @param {number} [options.offset] - Offset para paginação
 * 
 * @example
 * // Busca simples
 * advancedSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   table: "usuarios",
 *   select: ["id", "nome", "email"],
 *   where: { status: "ativo" },
 *   order_by: "nome ASC",
 *   limit: 20
 * })
 * 
 * @example
 * // Com JOIN
 * advancedSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   table: "pedidos",
 *   alias: "p",
 *   select: ["p.*", "c.nome as cliente_nome"],
 *   joins: [{
 *     type: "LEFT",
 *     table: "clientes",
 *     alias: "c",
 *     on: "p.cliente_id = c.id"
 *   }],
 *   where: { "p.status": "aprovado" },
 *   limit: 50
 * })
 */
async function advancedSelect(options) {
  const {
    project_id,
    id_instancia,
    table,
    alias,
    select,
    joins,
    where,
    where_raw,
    group_by,
    having,
    order_by,
    limit,
    offset,
  } = options;

  if (!project_id || !id_instancia || !table) {
    throw new Error("project_id, id_instancia e table são obrigatórios");
  }

  // 🔹 Criar a estrutura completa com valores padrão
  const payload = {
    project_id: Number(project_id),      // Go espera int64
    id_instancia: Number(id_instancia),  // Go espera int64
    table: table,
    alias: alias || "",
    select: Array.isArray(select) ? select : [],
    joins: Array.isArray(joins) ? joins : [],
    where: where && typeof where === "object" ? where : {},
    where_raw: where_raw || "",
    group_by: group_by || "",
    having: having || "",
    order_by: order_by || "",
    limit: limit || 0,
    offset: offset || 0,
  };

  console.log("📤 Payload enviado para Go /data/select:", JSON.stringify(payload, null, 2));

  return requestToGo("/data/select", payload);
}


/**
 * Join Select - SELECT com múltiplos JOINs complexos
 * 
 * @param {Object} options - Configurações
 * @param {number} options.project_id - ID do projeto
 * @param {number} options.id_instancia - ID da instância
 * @param {Object} options.base - Tabela base {table, alias, columns}
 * @param {Object[]} options.joins - Array de JOINs
 * @param {Object} [options.where] - Filtros simples
 * @param {string[]} [options.where_raw] - Array de condições WHERE
 * @param {string} [options.group_by] - GROUP BY
 * @param {string} [options.having] - HAVING
 * @param {string} [options.order_by] - ORDER BY
 * @param {number} [options.limit] - Limite
 * @param {number} [options.offset] - Offset
 * 
 * @example
 * joinSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   base: {
 *     table: "pedidos",
 *     alias: "p",
 *     columns: ["p.id", "p.total", "p.data_pedido"]
 *   },
 *   joins: [
 *     {
 *       type: "INNER",
 *       table: "clientes",
 *       alias: "c",
 *       on: "p.cliente_id = c.id",
 *       columns: ["c.nome", "c.email"]
 *     },
 *     {
 *       type: "LEFT",
 *       table: "pagamentos",
 *       alias: "pg",
 *       on: "p.id = pg.pedido_id",
 *       columns: ["pg.metodo", "pg.valor_pago"]
 *     }
 *   ],
 *   where: { "p.status": "aprovado" },
 *   where_raw: ["p.total > 100"],
 *   order_by: "p.data_pedido DESC"
 * })
 */
async function joinSelect(options) {
  // Desestruturação dos parâmetros com valores padrão
  const {
    project_id,
    id_instancia,
    base,
    joins = [],        // Se não houver joins, usa um array vazio
    where = {},        // Se não houver onde, usa um objeto vazio
    where_raw = [],    // Se não houver where_raw, usa um array vazio
    group_by = "",     // Se não houver group_by, usa uma string vazia
    having = "",       // Se não houver having, usa uma string vazia
    order_by = "",     // Se não houver order_by, usa uma string vazia
    limit = null,      // Se não houver limit, pode ser null
    offset = null,     // Se não houver offset, pode ser null
  } = options;

  // Checar se os campos obrigatórios estão presentes
  if (!project_id || !id_instancia || !base?.table) {
    throw new Error("project_id, id_instancia e base.table são obrigatórios");
  }

  // Estrutura de configuração final
  const payload = {
    project_id,
    id_instancia,
    base,
    joins,
    where,
    where_raw,
    group_by,
    having,
    order_by,
    limit,
    offset,
  };

  // Chama a requisição para o back-end
  return requestToGo("/data/join-select", payload);
}


/* ====================================================
   INSERT - INSERÇÕES
==================================================== */

/**
 * ====================================================
 * INSERT - Inserção de registro único
 * ====================================================
 *
 * Envia dados para o CORE (Go) inserir um único registro
 * respeitando o isolamento por projeto e instância.
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,
 *   id_instancia: number,
 *   table: string,
 *   data: object
 * }
 *
 * Campos obrigatórios:
 * - project_id
 * - id_instancia
 * - table
 * - data (mínimo 1 campo)
 *
 * @param {number} project_id
 * @param {number} id_instancia
 * @param {string} table
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
async function insert(project_id, id_instancia, table, data) {

  // 🔹 Estrutura padrão da rota INSERT
  const payload = {
    project_id: project_id ?? null,
    id_instancia: id_instancia ?? null,
    table: table ?? "",
    data: data ?? {},
  };

  // 🔹 Validação mínima no distribuidor
  if (!payload.project_id)
    throw new Error("project_id é obrigatório");

  if (!payload.id_instancia)
    throw new Error("id_instancia é obrigatório");

  if (!payload.table)
    throw new Error("table é obrigatória");

  if (Object.keys(payload.data).length === 0)
    throw new Error("data não pode ser vazio");

  // 🔹 Envia para o CORE
  return requestToGo("/data/insert", payload);
}

/**
 * ====================================================
 * BATCH INSERT - Inserção de múltiplos registros
 * ====================================================
 *
 * Envia múltiplos registros para o CORE (Go) inserir
 * respeitando o isolamento por projeto e instância.
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,      // ID do projeto
 *   id_instancia: number,    // ID da instância
 *   table: string,           // Nome da tabela
 *   data: Array<object>      // Array de registros
 * }
 *
 * Cada objeto em `data` será complementado automaticamente
 * com `id_instancia` se não estiver presente.
 *
 * Estrutura de retorno esperada:
 * {
 *   success: boolean,        // true se operação OK
 *   message: string,         // Mensagem de status
 *   count: number            // Quantidade de registros inseridos
 * }
 *
 * @param {number} project_id
 * @param {number} id_instancia
 * @param {string} table
 * @param {Object[]} data
 *
 * @example
 * batchInsert(1, 10, "produtos", [
 *   { nome: "Produto 1", preco: 10.50 },
 *   { nome: "Produto 2", preco: 20.00 },
 *   { nome: "Produto 3", preco: 15.75 }
 * ])
 *
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 */
async function batchInsert(project_id, id_instancia, table, data) {

  // 🔹 Estrutura padrão pré-definida
  const payload = {
    project_id: project_id ?? null,
    id_instancia: id_instancia ?? null,
    table: table ?? "",
    data: Array.isArray(data) ? data.map(row => ({
      ...row,
      id_instancia: row.id_instancia ?? id_instancia // garante id_instancia
    })) : [],
  };

  // 🔹 Validações mínimas
  if (!payload.project_id)
    throw new Error("project_id é obrigatório");

  if (!payload.id_instancia)
    throw new Error("id_instancia é obrigatório");

  if (!payload.table)
    throw new Error("table é obrigatória");

  if (!Array.isArray(payload.data) || payload.data.length === 0)
    throw new Error("data (array) não pode ser vazio");

  // 🔹 Envia para o CORE (Go)
  return requestToGo("/data/batch-insert", payload);
}

/* ====================================================
   UPDATE - ATUALIZAÇÕES
==================================================== */
/**
 * ====================================================
 * UPDATE - Atualizar um único registro
 * ====================================================
 *
 * Envia uma atualização para o CORE (Go) para um único registro,
 * baseado no projeto, instância e filtros definidos.
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,      // ID do projeto
 *   id_instancia: number,    // ID da instância
 *   table: string,           // Nome da tabela
 *   data: object,            // Dados a atualizar (ex: { status: "ativo" })
 *   where: object,           // Filtros WHERE (ex: { id: 5 })
 *   where_raw: string        // Filtro customizado, opcional
 * }
 *
 * Estrutura de retorno esperada:
 * {
 *   success: boolean,        // true se operação OK
 *   message: string,         // Mensagem de status
 *   count: number            // Quantidade de registros afetados (geralmente 1)
 * }
 *
 * @param {number} project_id - ID do projeto
 * @param {number} id_instancia - ID da instância
 * @param {string} table - Nome da tabela
 * @param {Object} data - Dados a atualizar
 * @param {Object} [where] - Filtros WHERE
 * @param {string} [where_raw] - WHERE customizado
 *
 * @example
 * update(1, 10, "usuarios", { status: "inativo" }, { id: 5 })
 *
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 */
async function update(project_id, id_instancia, table, data, where = {}, where_raw = null) {
  if (!project_id || !id_instancia || !table || !data) {
    throw new Error("project_id, id_instancia, table e data são obrigatórios");
  }

  // 🔹 Estrutura predefinida
  const payload = {
    project_id,
    id_instancia,
    table,
    data,
    where: where || {},
    where_raw: where_raw || "",
  };

  return requestToGo("/data/update", payload);
}

/**
 * ====================================================
 * BATCH UPDATE - Atualizar múltiplos registros
 * ====================================================
 *
 * Envia múltiplas atualizações para o CORE (Go) para registros distintos,
 * cada um com suas condições de atualização (dados e WHERE).
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,      // ID do projeto
 *   id_instancia: number,    // ID da instância
 *   table: string,           // Nome da tabela
 *   updates: array           // Array de objetos { data, where }
 * }
 *
 * Cada objeto de `updates` contém:
 * - `data`: os dados a serem atualizados
 * - `where`: os filtros WHERE para identificar os registros a atualizar
 *
 * Estrutura de retorno esperada:
 * {
 *   success: boolean,        // true se operação OK
 *   message: string,         // Mensagem de status
 *   count: number            // Quantidade de registros atualizados
 * }
 *
 * @param {number} project_id - ID do projeto
 * @param {number} id_instancia - ID da instância
 * @param {string} table - Nome da tabela
 * @param {Object[]} updates - Array de objetos { data, where }
 *
 * @example
 * batchUpdate(1, 10, "usuarios", [
 *   { data: { status: "ativo" }, where: { id: 1 } },
 *   { data: { status: "inativo" }, where: { id: 2 } }
 * ])
 *
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 */
async function batchUpdate(project_id, id_instancia, table, updates) {
  if (!project_id || !id_instancia || !table || !Array.isArray(updates)) {
    throw new Error("project_id, id_instancia, table e updates (array) são obrigatórios");
  }

  // 🔹 Estrutura predefinida
  const payload = {
    project_id,
    id_instancia,
    table,
    updates: updates || [],
  };

  return requestToGo("/data/batch-update", payload);
}


/* ====================================================
   DELETE - REMOÇÕES
==================================================== */
/**
 * ====================================================
 * DELETE - Remover registros (hard ou soft delete)
 * ====================================================
 *
 * Envia uma requisição para remover registros do banco de dados.
 * Você pode escolher entre realizar um **hard delete** (remoção definitiva)
 * ou um **soft delete** (marcar o registro como deletado com `deleted_at`).
 *
 * Estrutura enviada ao Go:
 * {
 *   project_id: number,      // ID do projeto
 *   id_instancia: number,    // ID da instância
 *   table: string,           // Nome da tabela
 *   where: object,           // Filtros WHERE (ex: { id: 5 })
 *   where_raw: string,       // Filtro raw customizado
 *   mode: string,            // "hard" ou "soft" (padrão: "hard")
 * }
 *
 * Estrutura de retorno esperada:
 * {
 *   success: boolean,        // true se operação OK
 *   message: string,         // Mensagem de status
 *   mode: string,            // "hard" ou "soft"
 *   count: number            // Quantidade de registros afetados
 * }
 *
 * @param {number} project_id - ID do projeto
 * @param {number} id_instancia - ID da instância
 * @param {string} table - Nome da tabela
 * @param {Object} [where] - Filtros WHERE
 * @param {string} [where_raw] - WHERE customizado
 * @param {string} [mode="hard"] - Modo de delete ("hard" ou "soft")
 *
 * @example
 * // Hard delete (remove do banco)
 * deleteRecords(1, 10, "logs", { id: 100 }, null, "hard")
 *
 * @example
 * // Soft delete (marca como deletado)
 * deleteRecords(1, 10, "usuarios", { email: "remover@example.com" }, null, "soft")
 *
 * @returns {Promise<{success: boolean, message: string, mode: string, count: number}>}
 */
async function deleteRecords(project_id, id_instancia, table, where = {}, where_raw = null, mode = "hard") {
  if (!project_id || !id_instancia || !table) {
    throw new Error("project_id, id_instancia e table são obrigatórios");
  }

  return requestToGo("/data/delete", {
    project_id,
    id_instancia,
    table,
    where,
    where_raw,
    mode,
  });
}

/* ====================================================
   AGGREGATE - AGREGAÇÕES
==================================================== */

/**
 * Aggregate - Operações de agregação
 * 
 * @param {number} project_id - ID do projeto
 * @param {number} id_instancia - ID da instância
 * @param {string} table - Nome da tabela
 * @param {string} operation - COUNT, SUM, AVG, MIN, MAX, EXISTS
 * @param {string} [column] - Coluna (necessária para SUM, AVG, MIN, MAX)
 * @param {Object} [where] - Filtros WHERE
 * 
 * @example
 * // COUNT
 * aggregate(1, 10, "usuarios", "COUNT", null, { status: "ativo" })
 * 
 * @example
 * // SUM
 * aggregate(1, 10, "pedidos", "SUM", "total", { status: "pago" })
 * 
 * @example
 * // AVG
 * aggregate(1, 10, "avaliacoes", "AVG", "nota")
 * 
 * @example
 * // EXISTS
 * aggregate(1, 10, "usuarios", "EXISTS", null, { email: "verificar@example.com" })
 * 
 * @returns {Promise<{success: boolean, result: number|boolean}>}
 */
async function aggregate(project_id, id_instancia, table, operation, column = null, where = {}) {
  if (!project_id || !id_instancia || !table || !operation) {
    throw new Error("project_id, id_instancia, table e operation são obrigatórios");
  }

  return requestToGo("/data/aggregate", {
    project_id,
    id_instancia,
    table,
    operation,
    column,
    where,
  });
}

/* ====================================================
   EXPORTS
==================================================== */

export default {
  // SELECT
  advancedSelect,
  joinSelect,
  
  // INSERT
  insert,
  batchInsert,
  
  // UPDATE
  update,
  batchUpdate,
  
  // DELETE
  delete: deleteRecords,
  
  // AGGREGATE
  aggregate,

};


