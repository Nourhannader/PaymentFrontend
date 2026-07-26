async function apiRequest(endpoint, method="POST", body=null)
{

    showLoading(true);


    try {

        const response = await fetch(
            CONFIG.API_BASE_URL + endpoint,
            {
                method: method,

                headers:{
                    "Content-Type":"application/json"
                },

                body:
                    body 
                    ? JSON.stringify(body)
                    : null
            }
        );


        const data = await response.json();


        addConsoleLog(
            method,
            endpoint,
            response.status,
            body,
            data
        );


        if(!response.ok)
        {
            throw new Error(
                data.error || "API Error"
            );
        }


        return data;


    }
    catch(error)
    {

        Swal.fire(
        {
            icon:"error",
            title:"Payment Error",
            text:error.message
        });


        throw error;

    }
    finally
    {
        showLoading(false);
    }

}