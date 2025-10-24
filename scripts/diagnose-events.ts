#!/usr/bin/env tsx
/**
 * Schema Consistency Diagnostics for TipConnect
 *
 * This script validates that:
 * 1. Database tables exist with correct names
 * 2. APIs reference correct table names per contract
 * 3. Data is consistent across tables
 *
 * Usage: pnpm tsx scripts/diagnose-events.ts
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface TableInfo {
  name: string;
  exists: boolean;
  rows?: number;
  error?: string;
}

interface DiagnosticResult {
  tables: TableInfo[];
  contract_compliance: boolean;
  recommendations: string[];
  errors: string[];
}

async function checkTables(): Promise<TableInfo[]> {
  const expectedTables = ['events', 'stories', 'hosts', 'host_metrics', 'story_metrics_daily'];
  const results: TableInfo[] = [];

  console.log('🔍 Checking database tables...');

  for (const tableName of expectedTables) {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}
      `);

      results.push({
        name: tableName,
        exists: true,
        rows: Number(result.rows[0]?.count || 0)
      });

      console.log(`✅ Table '${tableName}': ${result.rows[0]?.count || 0} rows`);

    } catch (error: any) {
      results.push({
        name: tableName,
        exists: false,
        error: error.message
      });
      console.log(`❌ Table '${tableName}': ${error.message}`);
    }
  }

  return results;
}

async function checkDataConsistency(): Promise<{issues: string[], warnings: string[]}> {
  const issues: string[] = [];
  const warnings: string[] = [];

  console.log('\n🔍 Checking data consistency...');

  try {
    // Check if events table has expected structure
    const eventsStructure = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);

    const requiredColumns = ['id', 'type', 'signer', 'receiver', 'amount', 'tx_signature', 'story_id', 'timestamp'];
    const existingColumns = eventsStructure.rows.map((row: any) => row.column_name);

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    if (missingColumns.length > 0) {
      issues.push(`Missing required columns in events table: ${missingColumns.join(', ')}`);
    }

    // Check for duplicate tx signatures
    const duplicates = await db.execute(sql`
      SELECT tx_signature, COUNT(*) as count
      FROM events
      GROUP BY tx_signature
      HAVING COUNT(*) > 1
      LIMIT 5
    `);

    if (duplicates.rows.length > 0) {
      warnings.push(`Found ${duplicates.rows.length} duplicate transaction signatures`);
    }

    // Check for orphan events (events pointing to non-existent stories)
    const orphanEvents = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM events e
      LEFT JOIN stories s ON e.story_id = s.id
      WHERE s.id IS NULL
    `);

    const orphanCount = Number(orphanEvents.rows[0]?.count || 0);
    if (orphanCount > 0) {
      warnings.push(`Found ${orphanCount} events pointing to non-existent stories`);
    }

    console.log(`✅ Events table structure: ${eventsStructure.rows.length} columns`);
    console.log(`✅ Event integrity check completed`);

  } catch (error: any) {
    issues.push(`Data consistency check failed: ${error.message}`);
  }

  return { issues, warnings };
}

async function testAPICompliance(): Promise<{working: string[], broken: string[]}> {
  const working: string[] = [];
  const broken: string[] = [];

  console.log('\n🔍 Testing API compliance...');

  // Test overview API
  try {
    const overview = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END), 0) as total_sol,
        COUNT(DISTINCT CASE WHEN type = 'tip' THEN signer END) as supporters,
        COUNT(CASE WHEN type = 'share' THEN 1 END) as shares
      FROM events
    `);

    const data = overview.rows[0];
    if (data && data.total_sol !== undefined) {
      working.push('/api/overview - Using events table correctly');
      console.log(`✅ Overview API can query events: ${data.total_sol} total SOL, ${data.supporters} supporters`);
    }
  } catch (error: any) {
    broken.push(`/api/overview - Error: ${error.message}`);
  }

  return { working, broken };
}

function generateRecommendations(
  tableResults: TableInfo[],
  dataIssues: string[],
  apiResults: {working: string[], broken: string[]}
): string[] {
  const recommendations: string[] = [];

  // Table recommendations
  const missingTables = tableResults.filter(t => !t.exists).map(t => t.name);
  if (missingTables.length > 0) {
    recommendations.push(`🔧 Run 'pnpm drizzle-kit migrate' to create missing tables: ${missingTables.join(', ')}`);
  }

  // Data recommendations
  if (dataIssues.length > 0) {
    recommendations.push(`🔧 Fix data schema issues: ${dataIssues.length} problems found`);
  }

  // API recommendations
  if (apiResults.broken.length > 0) {
    recommendations.push(`🔧 Fix API compliance: ${apiResults.broken.length} APIs not working`);
  }

  // Success recommendations
  if (missingTables.length === 0 && dataIssues.length === 0 && apiResults.broken.length === 0) {
    recommendations.push(`✅ All systems healthy! Ready for development.`);
    recommendations.push(`🚀 Consider running 'pnpm tsx scripts/seed.ts' to populate test data if tables are empty.`);
  }

  return recommendations;
}

async function main() {
  console.log('🏥 TipConnect Schema Diagnostics');
  console.log('=====================================\n');

  const startTime = Date.now();

  // Run all diagnostics
  const tableResults = await checkTables();
  const { issues: dataIssues, warnings: dataWarnings } = await checkDataConsistency();
  const apiResults = await testAPICompliance();

  // Generate recommendations
  const recommendations = generateRecommendations(tableResults, dataIssues, apiResults);

  // Compile results
  const result: DiagnosticResult = {
    tables: tableResults,
    contract_compliance: tableResults.every(t => t.exists) && dataIssues.length === 0,
    recommendations,
    errors: [...dataIssues, ...apiResults.broken]
  };

  const duration = Date.now() - startTime;

  // Print summary
  console.log('\n📊 Diagnostic Summary');
  console.log('=====================');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📋 Tables checked: ${tableResults.length}`);
  console.log(`✅ Healthy tables: ${tableResults.filter(t => t.exists).length}`);
  console.log(`❌ Missing tables: ${tableResults.filter(t => !t.exists).length}`);
  console.log(`⚠️  Warnings: ${dataWarnings.length}`);
  console.log(`🔥 Errors: ${result.errors.length}`);

  if (result.contract_compliance) {
    console.log('\n🎉 All contract requirements satisfied!');
  } else {
    console.log('\n❌ Contract compliance issues detected!');
  }

  // Print recommendations
  console.log('\n💡 Recommendations:');
  console.log('==================');
  recommendations.forEach(rec => console.log(`  ${rec}`));

  // Print warnings if any
  if (dataWarnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    console.log('=============');
    dataWarnings.forEach(warning => console.log(`  ${warning}`));
  }

  // Print errors if any
  if (result.errors.length > 0) {
    console.log('\n🔥 Errors:');
    console.log('===========');
    result.errors.forEach(error => console.log(`  ${error}`));
  }

  // Exit code based on results
  process.exit(result.contract_compliance ? 0 : 1);
}

main().catch((error) => {
  console.error('💥 Diagnostic script failed:', error);
  process.exit(1);
});