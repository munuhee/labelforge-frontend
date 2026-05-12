"use client"

import { ExternalLink, FileText, MessageCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TopBar } from "@/components/top-bar"

// Replace this URL with your actual Google Docs documentation link
const DOCUMENTATION_URL = "https://docs.google.com/document/d/your-doc-id/edit"

export default function HelpPage() {
  return (
    <>
      <TopBar title="Help" subtitle="Documentation and support" />
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Documentation Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documentation
              </CardTitle>
              <CardDescription className="text-xs">
                Access the full LabelForge documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our comprehensive documentation covers everything you need to know about using LabelForge, 
                including task guidelines, best practices, and detailed instructions for each task type.
              </p>
              <Button asChild className="w-full sm:w-auto">
                <a href={DOCUMENTATION_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Documentation
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Contact Support Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription className="text-xs">
                Get help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                We typically respond within 24 hours.
              </p>
              <Button variant="outline" className="w-full sm:w-auto">
                Open Support Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">1.</span>
                  <span>Complete tasks before their deadlines to maintain good standing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">2.</span>
                  <span>Read task guidelines carefully before starting work.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">3.</span>
                  <span>Use the browser extension for Agentic AI tasks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">4.</span>
                  <span>Review feedback from completed tasks to improve quality scores.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
