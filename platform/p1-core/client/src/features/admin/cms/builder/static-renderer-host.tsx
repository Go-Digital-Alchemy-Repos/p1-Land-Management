import React, { createContext, useContext, type ComponentType, type ReactNode } from "react";
export type StaticRendererUi = Record<string, ComponentType<any>>;
const Context = createContext<StaticRendererUi | null>(null);
export const StaticRendererHostProvider = Context.Provider;
const view = (name: string) => (props: any) => {
  const ui = useContext(Context);
  if (!ui?.[name]) throw new Error(`Missing renderer component ${name}`);
  const View = ui[name];
  return <View {...props} />;
};
export const Button = view("Button"),
  Card = view("Card"),
  CardContent = view("CardContent"),
  CardHeader = view("CardHeader"),
  CardTitle = view("CardTitle"),
  FormModalButton = view("FormModalButton"),
  Accordion = view("Accordion"),
  AccordionContent = view("AccordionContent"),
  AccordionItem = view("AccordionItem"),
  AccordionTrigger = view("AccordionTrigger"),
  Carousel = view("Carousel"),
  CarouselContent = view("CarouselContent"),
  CarouselItem = view("CarouselItem"),
  CarouselNext = view("CarouselNext"),
  CarouselPrevious = view("CarouselPrevious");

export const Link = view("Link"),
  Input = view("Input");
