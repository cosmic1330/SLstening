import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zifjsqcvahkpytcklzed.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmpzcWN2YWhrcHl0Y2tsemVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3OTQwOTgsImV4cCI6MjA1ODM3MDA5OH0.6-TfHphUfK9nUMRj0RIA6ZaMSCFvsMBiH5HsM_Zjj48";
export const supabase = createClient(supabaseUrl, supabaseKey);
