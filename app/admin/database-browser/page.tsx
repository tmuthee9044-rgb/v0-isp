"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database, Play, RefreshCw, TableIcon, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface TableInfo {
  table_name: string
  row_count: number
  column_count: number
}

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

export default function DatabaseBrowserPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [tableData, setTableData] = useState<any[]>([])
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [sqlQuery, setSqlQuery] = useState("")
  const [queryResults, setQueryResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalRows, setTotalRows] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableData()
      fetchTableSchema()
    }
  }, [selectedTable, page, pageSize])

  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/database/tables")
      const data = await response.json()
      if (data.success) {
        setTables(data.tables)
      } else {
        toast.error("Failed to fetch tables")
      }
    } catch (error) {
      toast.error("Error fetching tables")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTableData = async () => {
    if (!selectedTable) return
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/database/tables/${selectedTable}?page=${page}&pageSize=${pageSize}&search=${searchTerm}`,
      )
      const data = await response.json()
      if (data.success) {
        setTableData(data.rows)
        setTotalRows(data.total)
      } else {
        toast.error("Failed to fetch table data")
      }
    } catch (error) {
      toast.error("Error fetching table data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTableSchema = async () => {
    if (!selectedTable) return
    try {
      const response = await fetch(`/api/admin/database/tables/${selectedTable}/schema`)
      const data = await response.json()
      if (data.success) {
        setColumns(data.columns)
      }
    } catch (error) {
      console.error("Error fetching schema:", error)
    }
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error("Please enter a SQL query")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
      })
      const data = await response.json()

      if (data.success) {
        setQueryResults(data)
        toast.success(`Query executed successfully. ${data.rowCount || 0} rows affected.`)
      } else {
        toast.error(data.error || "Query execution failed")
        setQueryResults({ error: data.error })
      }
    } catch (error) {
      toast.error("Error executing query")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalRows / pageSize)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Database Browser
          </h1>
          <p className="text-muted-foreground">Browse tables, view data, and execute SQL queries</p>
        </div>
        <Button onClick={fetchTables} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">
            <TableIcon className="h-4 w-4 mr-2" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="query">
            <Play className="h-4 w-4 mr-2" />
            SQL Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Table List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Tables ({tables.length})</CardTitle>
                <CardDescription>Select a table to view data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tables.map((table) => (
                  <Button
                    key={table.table_name}
                    variant={selectedTable === table.table_name ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedTable(table.table_name)
                      setPage(1)
                      setSearchTerm("")
                    }}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{table.table_name}</div>
                      <div className="text-xs text-muted-foreground">{table.row_count} rows</div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Table Data */}
            <Card className="md:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTable || "Select a table"}</CardTitle>
                    <CardDescription>{selectedTable && `${totalRows} total rows`}</CardDescription>
                  </div>
                  {selectedTable && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                      />
                      <Button size="sm" onClick={fetchTableData}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedTable ? (
                  <>
                    {/* Schema Info */}
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Schema</h4>
                      <div className="flex flex-wrap gap-2">
                        {columns.map((col) => (
                          <Badge key={col.column_name} variant="outline">
                            {col.column_name}: {col.data_type}
                            {col.is_nullable === "NO" && " *"}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="border rounded-lg overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.map((col) => (
                              <TableHead key={col.column_name}>{col.column_name}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={columns.length} className="text-center">
                                <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : tableData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                                No data found
                              </TableCell>
                            </TableRow>
                          ) : (
                            tableData.map((row, idx) => (
                              <TableRow key={idx}>
                                {columns.map((col) => (
                                  <TableCell key={col.column_name}>
                                    {row[col.column_name] === null ? (
                                      <span className="text-muted-foreground italic">NULL</span>
                                    ) : typeof row[col.column_name] === "object" ? (
                                      <code className="text-xs">{JSON.stringify(row[col.column_name])}</code>
                                    ) : (
                                      String(row[col.column_name])
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => {
                            setPageSize(Number(value))
                            setPage(1)
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a table from the list to view its data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SQL Query Executor</CardTitle>
              <CardDescription>Execute custom SQL queries (SELECT, INSERT, UPDATE, DELETE)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM customers LIMIT 10;"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono min-h-[200px]"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={executeQuery} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? "Executing..." : "Execute Query"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSqlQuery("")
                    setQueryResults(null)
                  }}
                >
                  Clear
                </Button>
              </div>

              {queryResults && (
                <div className="border rounded-lg p-4">
                  {queryResults.error ? (
                    <div className="text-red-600">
                      <h4 className="font-semibold mb-2">Error:</h4>
                      <pre className="text-sm whitespace-pre-wrap">{queryResults.error}</pre>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Badge variant="default">{queryResults.rowCount} rows affected</Badge>
                        <span className="text-sm text-muted-foreground ml-2">
                          Executed in {queryResults.executionTime}ms
                        </span>
                      </div>

                      {queryResults.rows && queryResults.rows.length > 0 && (
                        <div className="border rounded-lg overflow-auto max-h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(queryResults.rows[0]).map((key) => (
                                  <TableHead key={key}>{key}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {queryResults.rows.map((row: any, idx: number) => (
                                <TableRow key={idx}>
                                  {Object.values(row).map((value: any, cellIdx: number) => (
                                    <TableCell key={cellIdx}>
                                      {value === null ? (
                                        <span className="text-muted-foreground italic">NULL</span>
                                      ) : typeof value === "object" ? (
                                        <code className="text-xs">{JSON.stringify(value)}</code>
                                      ) : (
                                        String(value)
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
