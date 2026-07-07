import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Agency divisions configuration
const DIVISIONS_CONFIG = {
  'academic': { label: 'Academic', category: 'academic', agency_type: 'agency' },
  'design': { label: 'Design', category: 'design', agency_type: 'agency' },
  'engineering': { label: 'Engineering', category: 'engineering', agency_type: 'agency' },
  'finance': { label: 'Finance', category: 'finance', agency_type: 'agency' },
  'game-development': { label: 'Game Development', category: 'gaming', agency_type: 'agency' },
  'gis': { label: 'GIS', category: 'gis', agency_type: 'agency' },
  'marketing': { label: 'Marketing', category: 'marketing', agency_type: 'agency' },
  'paid-media': { label: 'Paid Media', category: 'paid-media', agency_type: 'agency' },
  'product': { label: 'Product', category: 'product', agency_type: 'agency' },
  'project-management': { label: 'Project Management', category: 'project-mgmt', agency_type: 'agency' },
  'sales': { label: 'Sales', category: 'sales', agency_type: 'agency' },
  'security': { label: 'Security', category: 'security', agency_type: 'agency' },
  'spatial-computing': { label: 'Spatial Computing', category: 'spatial', agency_type: 'agency' },
  'specialized': { label: 'Specialized', category: 'specialized', agency_type: 'agency' },
  'support': { label: 'Support', category: 'support', agency_type: 'agency' },
  'testing': { label: 'Testing', category: 'testing', agency_type: 'agency' }
};

const NON_DIVISION_DIRS = ['integrations', 'strategy', 'examples', 'scripts'];

// Parse markdown file
function parseAgentFile(filePath: string, division: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  
  const fileName = path.basename(filePath, '.md');
  
  return {
    name: data.name || fileName,
    description: data.description || '',
    emoji: data.emoji || '',
    color: data.color || '',
    vibe: data.vibe || '',
    prompt: content,
    division: division,
    category: DIVISIONS_CONFIG[division as keyof typeof DIVISIONS_CONFIG]?.category || 'other',
    agency_type: DIVISIONS_CONFIG[division as keyof typeof DIVISIONS_CONFIG]?.agency_type || 'agency',
    tags: [division, data.name?.toLowerCase().replace(/\s+/g, '-') || fileName].filter(Boolean)
  };
}

// Get all agent files from a division
function getAgentFiles(divisionPath: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(divisionPath)) {
    console.warn(`⚠️ Division directory not found: ${divisionPath}`);
    return files;
  }
  
  const items = fs.readdirSync(divisionPath, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      // Recursively process subdirectories (e.g., unity, unreal-engine, godot)
      const subDirPath = path.join(divisionPath, item.name);
      const subFiles = getAgentFiles(subDirPath);
      files.push(...subFiles);
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(path.join(divisionPath, item.name));
    }
  }
  
  return files;
}

// Import agents to Supabase
async function importAgents() {
  console.log('🚀 Starting agency agents import...\n');
  
  // Use a valid UUID for system-created skills
  const systemUserId = '00000000-0000-0000-0000-000000000001'; // System user UUID
  console.log(`👤 Using system user ID: ${systemUserId}`);
  
  const agencyAgentsPath = path.join(process.cwd(), '.agency-agents');
  
  if (!fs.existsSync(agencyAgentsPath)) {
    console.error('❌ .agency-agents directory not found');
    console.log('Please clone the repository first: git clone https://github.com/msitarzewski/agency-agents.git .agency-agents');
    process.exit(1);
  }
  
  const divisions = fs.readdirSync(agencyAgentsPath, { withFileTypes: true });
  
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const division of divisions) {
    if (!division.isDirectory()) continue;
    if (NON_DIVISION_DIRS.includes(division.name)) continue;
    
    const divisionPath = path.join(agencyAgentsPath, division.name);
    const config = DIVISIONS_CONFIG[division.name as keyof typeof DIVISIONS_CONFIG];
    
    if (!config) {
      console.warn(`⚠️ No configuration for division: ${division.name}`);
      continue;
    }
    
    console.log(`📁 Processing ${config.label} division (${division.name})...`);
    
    const agentFiles = getAgentFiles(divisionPath);
    console.log(`   Found ${agentFiles.length} agent files`);
    
    for (const filePath of agentFiles) {
      try {
        const agent = parseAgentFile(filePath, division.name);
        
        // Check if skill already exists
        const { data: existing } = await supabase
          .from('skills')
          .select('id')
          .eq('name', agent.name)
          .eq('agency_type', 'agency')
          .single();
        
        if (existing) {
          console.log(`   ⏭️  Skipped (exists): ${agent.name}`);
          totalSkipped++;
          continue;
        }
        
        // Insert skill
        const { error: insertError } = await supabase
          .from('skills')
          .insert([{
            name: agent.name,
            description: agent.description,
            prompt: agent.prompt,
            category: agent.category,
            tags: agent.tags,
            is_public: true,
            agency_type: agent.agency_type,
            created_by: systemUserId, // Use system user ID
            version: 1,
            metadata: {
              emoji: agent.emoji,
              color: agent.color,
              vibe: agent.vibe,
              division: agent.division,
              source: 'agency-agents'
            }
          }]);
        
        if (insertError) {
          console.error(`   ❌ Error importing ${agent.name}:`, insertError.message);
          totalErrors++;
        } else {
          console.log(`   ✅ Imported: ${agent.name} ${agent.emoji}`);
          totalImported++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${filePath}:`, error);
        totalErrors++;
      }
    }
    
    console.log('');
  }
  
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${totalImported}`);
  console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📈 Total: ${totalImported + totalSkipped + totalErrors}`);
  
  if (totalImported > 0) {
    console.log('\n✨ Import completed successfully!');
  } else if (totalSkipped > 0) {
    console.log('\nℹ️  All agents already imported');
  } else {
    console.log('\n⚠️  No agents were imported');
  }
}

// Run the import
importAgents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
