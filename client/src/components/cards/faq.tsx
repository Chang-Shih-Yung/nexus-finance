"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n/context"

function QuestionList({ questions }: { questions: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible defaultValue="item-0">
      {questions.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function Faq() {
  const { t } = useI18n()

  const generalQuestions = [
    { q: t('cards.faq.generalQ1'), a: t('cards.faq.generalA1') },
    { q: t('cards.faq.generalQ2'), a: t('cards.faq.generalA2') },
    { q: t('cards.faq.generalQ3'), a: t('cards.faq.generalA3') },
  ]
  const transactionQuestions = [
    { q: t('cards.faq.transactionQ1'), a: t('cards.faq.transactionA1') },
    { q: t('cards.faq.transactionQ2'), a: t('cards.faq.transactionA2') },
    { q: t('cards.faq.transactionQ3'), a: t('cards.faq.transactionA3') },
  ]
  const riskQuestions = [
    { q: t('cards.faq.riskQ1'), a: t('cards.faq.riskA1') },
    { q: t('cards.faq.riskQ2'), a: t('cards.faq.riskA2') },
    { q: t('cards.faq.riskQ3'), a: t('cards.faq.riskA3') },
  ]

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              {t('cards.faq.general')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1">
              {t('cards.faq.transactions')}
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex-1">
              {t('cards.faq.riskControl')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <QuestionList questions={generalQuestions} />
          </TabsContent>
          <TabsContent value="transactions">
            <QuestionList questions={transactionQuestions} />
          </TabsContent>
          <TabsContent value="risk">
            <QuestionList questions={riskQuestions} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          {t('cards.faq.contactSupport')}
        </Button>
        <Button variant="link" className="w-full">
          {t('cards.faq.viewFullDocs')}
        </Button>
      </CardFooter>
    </Card>
  )
}
