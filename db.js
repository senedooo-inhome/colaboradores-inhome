// db.js — versão adaptada para Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ucgydfcwqazijkvcxreu.supabase.co';
const supabaseKey = 'sb_publishable_hLlZUMLwhC5nrbUelTA0jA_abl9qyi2';
const supabase = createClient(supabaseUrl, supabaseKey);

// Métodos principais
const init = async () => {
  console.log('[Supabase] Conectado');
};

const all = async () => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw error;
  return data;
};

const get = async (id) => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

const create = async (nome, status = 'ativo') => {
  const { data, error } = await supabase
    .from('colaboradores')
    .insert([{ nome, status, logado: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

const update = async (id, nome, status = 'ativo') => {
  const { data, error } = await supabase
    .from('colaboradores')
    .update({ nome, status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

const remove = async (id) => {
  const { error } = await supabase
    .from('colaboradores')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

const setLogado = async (id, logado) => {
  const { error } = await supabase
    .from('colaboradores')
    .update({ logado })
    .eq('id', id);
  if (error) throw error;
};

const countLogados = async () => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id', { count: 'exact', head: true })
    .eq('logado', true);
  if (error) throw error;
  return data;
};

const listLogados = async () => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('logado', true)
    .order('id', { ascending: false });
  if (error) throw error;
  return data;
};

const bulkSet = async (ids = []) => {
  // Zera todos
  const { error: resetError } = await supabase
    .from('colaboradores')
    .update({ logado: false })
    .neq('logado', false);
  if (resetError) throw resetError;

  // Ativa os selecionados
  for (const id of ids) {
    await supabase
      .from('colaboradores')
      .update({ logado: true })
      .eq('id', id);
  }
};

// Métodos de meta (opcional — pode remover se não usar mais)
const getMeta = async (key) => {
  const { data, error } = await supabase
    .from('meta')
    .select('val')
    .eq('key', key)
    .single();
  if (error) return null;
  return data?.val ?? null;
};

const setMeta = async (key, val) => {
  const { error } = await supabase
    .from('meta')
    .upsert({ key, val });
  if (error) throw error;
};

module.exports = {
  init,
  all,
  get,
  create,
  update,
  remove,
  setLogado,
  countLogados,
  listLogados,
  bulkSet,
  getMeta,
  setMeta,
};