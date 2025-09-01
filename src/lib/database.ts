export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  indexes?: DatabaseIndex[];
  relations?: DatabaseRelation[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: string;
  references?: {
    table: string;
    column: string;
  };
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface DatabaseRelation {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  table: string;
  column: string;
  referenceTable: string;
  referenceColumn: string;
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
  provider: 'postgresql' | 'mysql' | 'sqlite';
}

// Common table templates
export const commonTables: DatabaseTable[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'varchar(36)', primary: true },
      { name: 'email', type: 'varchar(255)', unique: true },
      { name: 'name', type: 'varchar(255)' },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'posts',
    columns: [
      { name: 'id', type: 'varchar(36)', primary: true },
      { name: 'title', type: 'varchar(255)' },
      { name: 'content', type: 'text' },
      { name: 'user_id', type: 'varchar(36)', references: { table: 'users', column: 'id' } },
      { name: 'published', type: 'boolean', default: 'false' },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  {
    name: 'comments',
    columns: [
      { name: 'id', type: 'varchar(36)', primary: true },
      { name: 'content', type: 'text' },
      { name: 'post_id', type: 'varchar(36)', references: { table: 'posts', column: 'id' } },
      { name: 'user_id', type: 'varchar(36)', references: { table: 'users', column: 'id' } },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  }
];

export function generateDrizzleSchema(schema: DatabaseSchema): string {
  const imports = [
    `import { ${getImports(schema)} } from 'drizzle-orm/${getOrmImport(schema.provider)}';`,
    schema.provider === 'postgresql' ? `import { relations } from 'drizzle-orm';` : ''
  ].filter(Boolean);

  const tables = schema.tables.map(table => generateTableSchema(table, schema.provider)).join('\n\n');
  
  const relations = generateRelations(schema.tables);

  return [
    ...imports,
    '',
    tables,
    relations && '\n// Relations',
    relations
  ].filter(Boolean).join('\n');
}

function getOrmImport(provider: string): string {
  switch (provider) {
    case 'postgresql': return 'pg-core';
    case 'mysql': return 'mysql-core';
    case 'sqlite': return 'sqlite-core';
    default: return 'pg-core';
  }
}

function getImports(schema: DatabaseSchema): string {
  const types = new Set(['pgTable', 'varchar', 'text', 'timestamp', 'boolean']);
  
  schema.tables.forEach(table => {
    table.columns.forEach(column => {
      const type = mapColumnType(column.type, schema.provider);
      types.add(type);
    });
  });

  return Array.from(types).join(', ');
}

function generateTableSchema(table: DatabaseTable, provider: string): string {
  const tableName = table.name;
  const tableFunction = getTableFunction(provider);
  
  const columns = table.columns.map(column => {
    const type = mapColumnType(column.type, provider);
    let columnDef = `  ${column.name}: ${type}('${column.name}')`;
    
    if (column.primary) columnDef += '.primaryKey()';
    if (column.unique) columnDef += '.unique()';
    if (!column.nullable) columnDef += '.notNull()';
    if (column.default) columnDef += `.default(${column.default})`;
    if (column.references) {
      columnDef += `.references(() => ${column.references.table}.${column.references.column})`;
    }
    
    return columnDef;
  }).join(',\n');

  return `export const ${tableName} = ${tableFunction}('${tableName}', {\n${columns}\n});`;
}

function generateRelations(tables: DatabaseTable[]): string {
  const relations: string[] = [];
  
  tables.forEach(table => {
    const tableRelations: string[] = [];
    
    // Find foreign key relations
    table.columns.forEach(column => {
      if (column.references) {
        const relatedTable = column.references.table;
        const relationName = relatedTable;
        tableRelations.push(`  ${relationName}: one(${relatedTable})`);
      }
    });
    
    // Find reverse relations
    tables.forEach(otherTable => {
      if (otherTable.name !== table.name) {
        otherTable.columns.forEach(column => {
          if (column.references?.table === table.name) {
            const relationName = `${otherTable.name}s`; // Pluralize
            tableRelations.push(`  ${relationName}: many(${otherTable.name})`);
          }
        });
      }
    });
    
    if (tableRelations.length > 0) {
      relations.push(`export const ${table.name}Relations = relations(${table.name}, ({ one, many }) => ({\n${tableRelations.join(',\n')}\n}));`);
    }
  });
  
  return relations.join('\n\n');
}

function getTableFunction(provider: string): string {
  switch (provider) {
    case 'postgresql': return 'pgTable';
    case 'mysql': return 'mysqlTable';
    case 'sqlite': return 'sqliteTable';
    default: return 'pgTable';
  }
}

function mapColumnType(type: string, _provider: string): string {
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('varchar')) return 'varchar';
  if (lowerType.includes('text')) return 'text';
  if (lowerType.includes('timestamp')) return 'timestamp';
  if (lowerType.includes('boolean') || lowerType.includes('bool')) return 'boolean';
  if (lowerType.includes('int')) return 'integer';
  if (lowerType.includes('decimal') || lowerType.includes('numeric')) return 'decimal';
  if (lowerType.includes('uuid')) return 'uuid';
  
  return 'varchar'; // Default fallback
}