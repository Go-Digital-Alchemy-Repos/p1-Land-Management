import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ImagePositionPicker as SharedPicker,
  type ImagePositionPickerProps,
} from "../builder/image-position-picker-workspace";
const components = { Button, Label };
export function ImagePositionPicker(props: Omit<ImagePositionPickerProps, "components">) {
  return <SharedPicker {...props} components={components} />;
}
