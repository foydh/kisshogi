import unittest

from kisshogi.usi import parse_bestmove, parse_id_name, parse_info, parse_option


class UsiTest(unittest.TestCase):
    def test_option_spin(self):
        option = parse_option("option name Threads type spin default 4 min 1 max 1024")
        self.assertEqual(option["name"], "Threads")
        self.assertEqual(option["type"], "spin")
        self.assertEqual(option["default"], "4")
        self.assertEqual(option["min"], 1)
        self.assertEqual(option["max"], 1024)

    def test_option_combo_with_spaces(self):
        option = parse_option(
            "option name BookFile type combo default standard book.db "
            "var no_book var standard book.db"
        )
        self.assertEqual(option["name"], "BookFile")
        self.assertEqual(option["default"], "standard book.db")
        self.assertEqual(option["vars"], ["no_book", "standard book.db"])

    def test_option_button_and_empty_string(self):
        button = parse_option("option name Clear Hash type button")
        self.assertEqual(button["type"], "button")
        string = parse_option("option name EvalDir type string default <empty>")
        self.assertEqual(string["default"], "")

    def test_info_cp(self):
        info = parse_info(
            "info depth 12 seldepth 14 multipv 2 score cp -35 nodes 100 nps 50 "
            "time 200 pv 7g7f 3c3d"
        )
        self.assertEqual(info["depth"], 12)
        self.assertEqual(info["seldepth"], 14)
        self.assertEqual(info["multipv"], 2)
        self.assertEqual(info["score"], {"type": "cp", "value": -35})
        self.assertEqual(info["pv"], ["7g7f", "3c3d"])

    def test_info_mate_bound(self):
        info = parse_info("info depth 4 score mate +3 lowerbound nodes 10 pv 7g7f")
        self.assertEqual(info["score"]["type"], "mate")
        self.assertEqual(info["score"]["value"], 3)
        self.assertEqual(info["score"]["bound"], "lowerbound")

    def test_info_string(self):
        self.assertEqual(parse_info("info string loading eval")["type"], "info_string")

    def test_bestmove(self):
        self.assertEqual(parse_bestmove("bestmove 7g7f ponder 8c8d"), {
            "type": "bestmove", "move": "7g7f", "ponder": "8c8d"
        })
        self.assertEqual(parse_bestmove("bestmove resign")["move"], "resign")

    def test_id(self):
        self.assertEqual(parse_id_name("id name Test Engine"), "Test Engine")


if __name__ == "__main__":
    unittest.main()
