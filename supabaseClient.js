import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ucgydfcwqazijkvcxreu.supabase.co';
const supabaseKey = 'sb_publishable_hLlZUMLwhC5nrbUelTA0jA_abl9qyi2';

export const supabase = createClient(supabaseUrl, supabaseKey);