//1.step- const asyncHandler = ()=>{}
//2.step- const asyncHandler = (func)=>{()=>{}}
//2.step- const asynHandler = (fn)=>()=>{}
// 3.step- const asyncHandler=(func)=>async()=>{}

//below is a async higher order function which is accepting
//  a function as a parameter.

// const asyncHandler=(func)=>async(req,res,next)=>{
//     try{
//         await func(req,res,next)
//     }
//     catch(error){
//         res.status(error.code||500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }

const asyncHandler = (requestHandler)=>{ return (req,res,next)=>{
     Promise.resolve(requestHandler(req,res,next))
     .catch((err)=>next(err))
    }
}

export default asyncHandler;