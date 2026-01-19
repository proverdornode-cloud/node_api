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