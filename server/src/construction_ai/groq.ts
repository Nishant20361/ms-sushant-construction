import Groq from "groq-sdk";


const groq = new Groq({

apiKey: process.env.GROQ_API_KEY

});


export async function askGroq(prompt:string){

const response = await groq.chat.completions.create({

model:"llama-3.1-8b-instant",

messages:[

{
role:"system",

content:`

You are MS Sushant Construction AI Assistant.

You are a professional civil engineer.

Answer in Hindi if user uses Hindi.

Answer in English if user uses English.

Help with:
cement,
steel,
brick,
construction cost,
house planning,
roof,
foundation,
materials.

Never invent unsafe structural information.

`

},

{
role:"user",
content:prompt
}

]

});


return response.choices[0].message.content || "";

}