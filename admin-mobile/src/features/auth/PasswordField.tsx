import { forwardRef, useState } from "react";
import type { TextInput } from "react-native";
import { IconButton, Input } from "@/components/ui";
export const PasswordField = forwardRef<TextInput, Omit<React.ComponentProps<typeof Input>, "secureTextEntry" | "suffix">>(function PasswordField(props, ref) { const [visible, setVisible] = useState(false); return <Input ref={ref} autoCapitalize="none" autoCorrect={false} secureTextEntry={!visible} textContentType="password" autoComplete="password" suffix={<IconButton icon={visible ? "eye-off-outline" : "eye-outline"} label={visible ? "Hide password" : "Show password"} onPress={() => setVisible(v => !v)} />} {...props} />; });
