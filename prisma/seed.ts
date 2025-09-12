import { PrismaClient, type Column, type Row } from "@prisma-app/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create a test user
  const user = await prisma.user.findUnique({
    where: { email: "amanthakur95@gmail.com" },
    select: {
      id: true,
      email: true,
      members: true,
    },
  });
  const organization = await prisma.organization.findUnique({
    where: { id: user?.members[0].organizationId },
  });
  if (!user) throw new Error("No user");
  if (!organization) throw new Error("No organization");

  console.log("✅ Found user:", user.email);

  // Create sample tables with different types of data
  const tableConfigs = [
    {
      name: "Companies Database",
      columns: [
        "Company Name",
        "Industry",
        "Founded Year",
        "Revenue",
        "CEO",
        "Headquarters",
        "Employees",
      ],
      generateRow: () => [
        faker.company.name(),
        faker.commerce.department(),
        faker.date.past({ years: 50 }).getFullYear().toString(),
        faker.finance.amount({
          min: 1,
          max: 1000,
          dec: 1,
          symbol: "$",
        }),
        faker.person.fullName(),
        faker.location.city() + ", " + faker.location.state(),
        faker.number.int({ min: 50, max: 50000 }).toLocaleString(),
      ],
    },
    {
      name: "People Directory",
      columns: [
        "Full Name",
        "Email",
        "Phone",
        "Job Title",
        "Department",
        "LinkedIn",
        "Location",
      ],
      generateRow: () => [
        faker.person.fullName(),
        faker.internet.email(),
        faker.phone.number(),
        faker.person.jobTitle(),
        faker.commerce.department(),
        faker.internet.url(),
        faker.location.city() + ", " + faker.location.country(),
      ],
    },
    {
      name: "Products Catalog",
      columns: [
        "Product Name",
        "Category",
        "Price",
        "Brand",
        "SKU",
        "Description",
        "Launch Date",
      ],
      generateRow: () => [
        faker.commerce.productName(),
        faker.commerce.department(),
        faker.commerce.price({ symbol: "$" }),
        faker.company.name(),
        faker.string.alphanumeric(8).toUpperCase(),
        faker.commerce.productDescription(),
        faker.date.past({ years: 5 }).toISOString().split("T")[0],
      ],
    },
  ];

  for (const tableConfig of tableConfigs) {
    // Create table
    const table = await prisma.table.create({
      data: {
        name: tableConfig.name,
        uploadKey: `uploads/${faker.string.uuid()}.csv`,
        organizationId: organization.id,
        createdBy: user.id,
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Created table:", table.name);

    // Create columns
    const createdColumns: Column[] = [];
    for (let i = 0; i < tableConfig.columns.length; i++) {
      const column = await prisma.column.create({
        data: {
          name: tableConfig.columns[i],
          position: i,
          tableId: table.id,
          createdAt: faker.date.past(),
          updatedAt: new Date(),
        },
      });
      createdColumns.push(column);
    }

    console.log("✅ Created columns:", createdColumns.length);

    // Create sample rows (5-15 rows per table)
    const rowCount = faker.number.int({ min: 5, max: 15 });
    const createdRows: Row[] = [];
    const allRowData = [];

    for (let i = 0; i < rowCount; i++) {
      const row = await prisma.row.create({
        data: {
          name: `Row ${i + 1}`,
          position: i,
          tableId: table.id,
          createdAt: faker.date.past(),
          updatedAt: new Date(),
        },
      });
      createdRows.push(row);
      allRowData.push(tableConfig.generateRow());
    }

    console.log("✅ Created rows:", createdRows.length);

    // Create cells and cell versions
    for (let rowIndex = 0; rowIndex < createdRows.length; rowIndex++) {
      const row = createdRows[rowIndex];
      const rowData = allRowData[rowIndex];

      for (let colIndex = 0; colIndex < createdColumns.length; colIndex++) {
        const column = createdColumns[colIndex];
        const cellValue = rowData[colIndex];

        // Create cell
        const cell = await prisma.cell.create({
          data: {
            rowId: row.id,
            columnId: column.id,
            createdAt: faker.date.past(),
            updatedAt: new Date(),
          },
        });

        // Create a run for this cell
        const run = await prisma.run.create({
          data: {
            tableId: table.id,
            // scope: "CELL",
            status: "COMPLETED",
            startedAt: faker.date.past(),
            finishedAt: faker.date.recent(),
            // cellId: cell.id,
            createdAt: faker.date.past(),
            updatedAt: new Date(),
          },
        });

        // Create cell version with the actual data
        await prisma.cellVersions.create({
          data: {
            cellId: cell.id,
            runId: run.id,
            value: cellValue,
            picked: true,
            origin: faker.helpers.arrayElement(["UPLOAD", "AI", "USER_EDIT"]),
            pickedAt: faker.date.recent(),
            confidence: faker.number.int({ min: 70, max: 100 }),
            sourceUrl: faker.helpers.maybe(() => faker.internet.url(), {
              probability: 0.3,
            }),
            createdAt: faker.date.past(),
            updatedAt: new Date(),
          },
        });
      }
    }

    console.log("✅ Created cells and cell versions");

    // Create table hints with realistic prompts
    const hintPrompts = [
      "Find additional information about company headquarters, employee count, and stock ticker symbols",
      "Enrich with social media profiles, website URLs, and contact information",
      "Add pricing information, availability status, and competitor analysis",
      "Include educational background, years of experience, and certifications",
      "Find company revenue, funding rounds, and key partnerships",
    ];

    await prisma.hint.create({
      data: {
        tableId: table.id,
        scope: "TABLE",
        prompt: faker.helpers.arrayElement(hintPrompts),
        websites: faker.helpers.arrayElements(
          [
            "bloomberg.com",
            "reuters.com",
            "crunchbase.com",
            "linkedin.com",
            "glassdoor.com",
            "forbes.com",
            "techcrunch.com",
            "pitchbook.com",
          ],
          { min: 2, max: 4 },
        ),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Created table hint");

    // Create cached table data
    const cachedTableData = {
      id: table.id,
      name: table.name,
      columns: tableConfig.columns.map((colName, index) => ({
        id: createdColumns[index].id,
        name: colName,
        position: index,
      })),
      rows: allRowData.map((rowData, index) => ({
        id: createdRows[index].id,
        position: index,
        cells: rowData.map((value, colIndex) => ({
          columnId: createdColumns[colIndex].id,
          value: value,
          origin: faker.helpers.arrayElement(["UPLOAD", "AI", "USER_EDIT"]),
          confidence: faker.number.int({ min: 70, max: 100 }),
        })),
      })),
      totalRows: rowCount,
      totalColumns: tableConfig.columns.length,
      lastEnriched: faker.date.recent(),
      enrichmentStats: {
        totalCells: rowCount * tableConfig.columns.length,
        enrichedCells: faker.number.int({
          min: 10,
          max: rowCount * tableConfig.columns.length,
        }),
        successRate: faker.number.float({
          min: 0.6,
          max: 0.95,
          fractionDigits: 2,
        }),
      },
    };

    await prisma.cachedTable.create({
      data: {
        tableId: table.id,
        data: cachedTableData,
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Created cached table");
  }

  // Create credits for the organization
  // await prisma.credits.create({
  //   data: {
  //     organizationId: organization.id,
  //     amount: faker.number.int({ min: 500, max: 5000 }),
  //     createdAt: faker.date.past(),
  //     updatedAt: new Date(),
  //   },
  // });

  console.log("✅ Created organization credits");

  // Create some additional runs for variety
  const allTables = await prisma.table.findMany();
  for (const table of allTables) {
    // Create some table-level runs
    await prisma.run.create({
      data: {
        tableId: table.id,
        // scope: "TABLE",
        status: faker.helpers.arrayElement(["COMPLETED", "FAILED", "RUNNING"]),
        startedAt: faker.date.past(),
        finishedAt: faker.helpers.maybe(() => faker.date.recent()),
        error: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.2,
        }),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Created additional runs");

  console.log("🎉 Seed completed successfully!");
  console.log(`📊 Created ${tableConfigs.length} tables with realistic data`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
