"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileText, Receipt, FileDown, FileUp, Plus, MoreVertical, Download, Edit, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const mockDocuments = {
  invoices: [
    {
      id: "1",
      number: "FE-001-00000001",
      client: "Empresa ABC S.A.",
      date: "2025-01-15",
      total: "₡125,000.00",
      status: "Aceptado",
      key: "50601012025011512345678901234567890123456789012",
    },
    {
      id: "2",
      number: "FE-001-00000002",
      client: "Comercial XYZ Ltda.",
      date: "2025-01-14",
      total: "₡89,500.00",
      status: "Pendiente",
      key: "50601012025011412345678901234567890123456789012",
    },
  ],
  tickets: [
    {
      id: "1",
      number: "TE-001-00000001",
      client: "Cliente Final",
      date: "2025-01-15",
      total: "₡15,000.00",
      status: "Aceptado",
      key: "50601012025011512345678901234567890123456789012",
    },
  ],
  creditNotes: [
    {
      id: "1",
      number: "NC-001-00000001",
      client: "Empresa ABC S.A.",
      date: "2025-01-13",
      total: "₡25,000.00",
      status: "Aceptado",
      key: "50601012025011312345678901234567890123456789012",
    },
  ],
  debitNotes: [],
}

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const handleDownloadPDF = (docId: string) => {
    console.log("[v0] Downloading PDF for document:", docId)
    // Implement PDF download logic
  }

  const handleDownloadXML = (docId: string) => {
    console.log("[v0] Downloading XML for document:", docId)
    // Implement XML download logic
  }

  const handleEdit = (docId: string) => {
    console.log("[v0] Editing document:", docId)
    // Implement edit logic
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Documentos Electrónicos" description="Gestionar documentos de facturación electrónica" />

      <div className="p-6">
        <Tabs defaultValue="invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="invoices">
                <FileText className="w-4 h-4 mr-2" />
                Facturas
              </TabsTrigger>
              <TabsTrigger value="tickets">
                <Receipt className="w-4 h-4 mr-2" />
                Tiquetes
              </TabsTrigger>
              <TabsTrigger value="credit-notes">
                <FileDown className="w-4 h-4 mr-2" />
                N. Crédito
              </TabsTrigger>
              <TabsTrigger value="debit-notes">
                <FileUp className="w-4 h-4 mr-2" />
                N. Débito
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Facturas Electrónicas */}
          <TabsContent value="invoices" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Facturas Electrónicas</h2>
                  <p className="text-muted-foreground mt-1">Gestiona tus facturas electrónicas</p>
                </div>
                <Button asChild className="gap-2 gradient-primary text-white">
                  <Link href="/dashboard/documents/invoice">
                    <Plus className="w-4 h-4" />
                    Nueva Factura
                  </Link>
                </Button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o clave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDocuments.invoices.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.number}</TableCell>
                        <TableCell>{doc.client}</TableCell>
                        <TableCell>{doc.date}</TableCell>
                        <TableCell className="font-semibold">{doc.total}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.status === "Aceptado"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(doc.id)} className="gap-2 cursor-pointer">
                                <Edit className="w-4 h-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadPDF(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadXML(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar XML
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Tiquetes Electrónicos */}
          <TabsContent value="tickets" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Tiquetes Electrónicos</h2>
                  <p className="text-muted-foreground mt-1">Gestiona tus tiquetes electrónicos</p>
                </div>
                <Button asChild className="gap-2 gradient-primary text-white">
                  <Link href="/dashboard/documents/ticket">
                    <Plus className="w-4 h-4" />
                    Nuevo Tiquete
                  </Link>
                </Button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o clave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDocuments.tickets.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.number}</TableCell>
                        <TableCell>{doc.client}</TableCell>
                        <TableCell>{doc.date}</TableCell>
                        <TableCell className="font-semibold">{doc.total}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(doc.id)} className="gap-2 cursor-pointer">
                                <Edit className="w-4 h-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadPDF(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadXML(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar XML
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Notas de Crédito */}
          <TabsContent value="credit-notes" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Notas de Crédito</h2>
                  <p className="text-muted-foreground mt-1">Gestiona tus notas de crédito</p>
                </div>
                <Button asChild className="gap-2 gradient-primary text-white">
                  <Link href="/dashboard/documents/credit-note">
                    <Plus className="w-4 h-4" />
                    Nueva Nota de Crédito
                  </Link>
                </Button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o clave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDocuments.creditNotes.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.number}</TableCell>
                        <TableCell>{doc.client}</TableCell>
                        <TableCell>{doc.date}</TableCell>
                        <TableCell className="font-semibold">{doc.total}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(doc.id)} className="gap-2 cursor-pointer">
                                <Edit className="w-4 h-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadPDF(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadXML(doc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                Descargar XML
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Notas de Débito */}
          <TabsContent value="debit-notes" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Notas de Débito</h2>
                  <p className="text-muted-foreground mt-1">Gestiona tus notas de débito</p>
                </div>
                <Button asChild className="gap-2 gradient-primary text-white">
                  <Link href="/dashboard/documents/debit-note">
                    <Plus className="w-4 h-4" />
                    Nueva Nota de Débito
                  </Link>
                </Button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o clave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="rounded-lg border text-center py-12">
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay notas de débito registradas</p>
                <Button asChild className="mt-4 gradient-primary text-white">
                  <Link href="/dashboard/documents/debit-note">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Nota de Débito
                  </Link>
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
