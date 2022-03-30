module.exports = (api) => {
  console.log("api", api.post);
  return api.post("/doppler/dplrwh", async (req, res) => {
    // const accessToken =
    //   "440e7b09edf8ef7ab35b90134974d58426be2954e24272174bd5cf72858630caf1ef2aaae897ccb52bfa363700b9b352fb64";
    // let body = await req.body;
    // if (!body) {
    //   body = { bodyEmpty: true };
    // }
    const headers = req.headers;

    console.log({
      headers,
      //   body,
    });
    res.status(200).send({ success: true, status: 200, data: true });
    res.end();
    return;
  });
};
