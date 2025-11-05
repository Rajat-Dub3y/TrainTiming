import Train from "../models/TrainModel.js";

export const getTrainInfo = async (req, res) => {
  try {
    const { trainNo } = req.params;

    const train = await Train.findOne({ Number: trainNo }).lean().select("-Stations");

    if (!train) {
      return res.status(404).json({ success: false, message: "Train not found" });
    }

    res.status(200).json({ success: true, data: train });
  } catch (err) {
    console.error("Error fetching train info:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
