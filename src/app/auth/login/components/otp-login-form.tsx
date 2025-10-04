

"use client"

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { requestOtp, verifyOtpAndLogin } from "../../actions"

const phoneSchema = z.object({
  phone: z.string().min(10, { message: "الرجاء إدخال رقم هاتف صحيح." }),
});

const otpSchema = z.object({
  otp: z.string().length(4, { message: "كود التحقق يجب أن يكون 4 أرقام." }),
});

const OtpInput = ({ length = 4, onChange }: { length?: number, onChange: (value: string) => void }) => {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const [values, setValues] = useState<string[]>(Array(length).fill(''));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        if (/^[0-9]$/.test(value) || value === '') {
            const newValues = [...values];
            newValues[index] = value;
            setValues(newValues);
            onChange(newValues.join(''));
            
            if(value && index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if(e.key === 'Backspace' && !values[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    return (
        <div className="flex justify-center gap-2" dir="ltr">
            {values.map((value, index) => (
                <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="tel"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="h-14 w-12 text-center text-2xl font-bold"
                />
            ))}
        </div>
    )
}

interface OtpLoginProps {
    phone: string;
    onVerify: (otp: string) => Promise<void>;
    onBack?: () => void;
}


export default function OtpLoginForm({ phone, onVerify, onBack }: OtpLoginProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" }
  });
  
  const handleVerifyOtp = async (data: z.infer<typeof otpSchema>) => {
    setIsVerifying(true);
    await onVerify(data.otp);
    setIsVerifying(false);
  };

  return (
    <Form {...otpForm}>
      <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="grid gap-4">
        <p className="text-sm text-center text-muted-foreground">تم إرسال كود التحقق إلى {phone}</p>
        <Controller
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <OtpInput onChange={field.onChange} />
              </FormControl>
              <FormMessage className="text-center"/>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isVerifying}>
          {isVerifying && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          تحقق وتسجيل الدخول
        </Button>
        {onBack && (
          <Button variant="link" size="sm" onClick={onBack}>
            العودة
          </Button>
        )}
      </form>
    </Form>
  )
}
