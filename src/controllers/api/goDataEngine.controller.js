/**
 * ====================================================
 * CONTROLLER GO DATA ENGINE
 * ====================================================
 */

import goDataEngineService from "../../services/goDataEngine.service.js";

/* ----------------------
   CRUD / OPERAÇÕES
---------------------- */
export async function insertRecordDebug(req, res) {
  try {
    const { project_id, id_instancia, table, data } = req.body;

    if (!project_id || !id_instancia || !table || !data) {
      return res.status(400).json({
        success: false,
        message: "project_id, id_instancia, table e data são obrigatórios"
      });
    }

    const result = await goDataEngineService.insertDebug(
      project_id,
      id_instancia,
      table,
      data
    );

    // 🔥 Repassa exatamente o que o Go retornou
    res.json({
      success: true,
      sql: result.sql,
      args: result.args
    });

  } catch (err) {
    console.error("❌ Erro no insert DEBUG:", err.message);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar SQL",
      error: err.message
    });
  }
}

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

// GET / Advanced Select
export async function advancedSelect(req, res) {
  try {
    const options = req.body;
    if (!options.project_id || !options.id_instancia || !options.table)
      return res.status(400).json({ success: false, message: "project_id, id_instancia e table são obrigatórios" });

    const result = await goDataEngineService.advancedSelect(options);
    res.json({ success: true, message: "Consulta realizada com sucesso", data: result, count: Array.isArray(result) ? result.length : 0 });
  } catch (err) {
    console.error("❌ Erro no advancedSelect:", err.message);
    res.status(500).json({ success: false, message: "Erro ao executar consulta avançada", error: err.message });
  }
}

// UPDATE
export async function updateRecord(req, res) {
  try {
    const { project_id, id_instancia, table, data, where, where_raw } = req.body;
    if (!project_id || !id_instancia || !table || !data)
      return res.status(400).json({ success: false, message: "project_id, id_instancia, table e data são obrigatórios" });

    const result = await goDataEngineService.update(project_id, id_instancia, table, data, where || {}, where_raw || null);
    res.json({ success: true, message: "Registro atualizado com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no update:", err.message);
    res.status(500).json({ success: false, message: "Erro ao atualizar registro", error: err.message });
  }
}

// Batch Update
export async function batchUpdate(req, res) {
  try {
    const { project_id, id_instancia, table, updates } = req.body;
    if (!project_id || !id_instancia || !table || !Array.isArray(updates))
      return res.status(400).json({ success: false, message: "project_id, id_instancia, table e updates (array) são obrigatórios" });

    const result = await goDataEngineService.batchUpdate(project_id, id_instancia, table, updates);
    res.json({ success: true, message: "Batch update realizado com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no batchUpdate:", err.message);
    res.status(500).json({ success: false, message: "Erro ao atualizar registros em lote", error: err.message });
  }
}

// DELETE
export async function deleteRecord(req, res) {
  try {
    const { project_id, id_instancia, table, where, where_raw, mode } = req.body;
    if (!project_id || !id_instancia || !table)
      return res.status(400).json({ success: false, message: "project_id, id_instancia e table são obrigatórios" });

    const result = await goDataEngineService.delete(project_id, id_instancia, table, where || {}, where_raw || null, mode || "hard");
    res.json({ success: true, message: "Registro(s) deletado(s) com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no delete:", err.message);
    res.status(500).json({ success: false, message: "Erro ao deletar registro(s)", error: err.message });
  }
}

// AGGREGATE
export async function aggregate(req, res) {
  try {
    const { project_id, id_instancia, table, operation, column, where } = req.body;
    if (!project_id || !id_instancia || !table || !operation)
      return res.status(400).json({ success: false, message: "project_id, id_instancia, table e operation são obrigatórios" });

    const result = await goDataEngineService.aggregate(project_id, id_instancia, table, operation, column || null, where || {});
    res.json({ success: true, message: "Agregação realizada com sucesso", data: result });
  } catch (err) {
    console.error("❌ Erro no aggregate:", err.message);
    res.status(500).json({ success: false, message: "Erro ao executar agregação", error: err.message });
  }
}

